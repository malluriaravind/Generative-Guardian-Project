import re
import asyncio
import logging
import socket

from beanie import Document
from beanie.odm.utils.init import Initializer

from pymongo.errors import OperationFailure
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection

# For patched initializer
from pymongo import IndexModel
from beanie.odm.fields import IndexModelField as _IndexModelField
from beanie.odm.utils.typing import get_index_attributes
from beanie.odm.utils.pydantic import get_model_fields

from .env import env
from .models import AppDocument
from .models.cfg import Cfg
from .models.maintenance import Heartbeat


log = logging.getLogger('trussed')

heartbeat: Heartbeat | None = None
appname: str | None = None
version: str | None = None
tasks = set()


async def init(
    db: AsyncIOMotorDatabase,
    *,
    appname: str,
    version: str,
    allow_index_dropping: bool | None = None,
    defer_index_creation: bool | None = None,
    additional_models: list[type[Document]] | None = None,
    export_cfg_to_environ_every=10,
    heartbeat_every=60,
):
    global heartbeat
    globals()['appname'] = appname
    globals()['version'] = version

    if allow_index_dropping is None:
        allow_index_dropping = env.bool('ALLOW_INDEX_DROPPING', True)

    if defer_index_creation is None:
        defer_index_creation = env.bool('DEFER_INDEX_CREATION', True)

    initializer = BeanieInitializer(
        database=db,
        allow_index_dropping=allow_index_dropping,
        defer_index_creation=defer_index_creation,
        document_models=AppDocument.document_models + (additional_models or []),
    )

    try:
        await initializer
    except OperationFailure as e:
        if e.code == 115 and re.match(r'time\s?series.*not supported', str(e), re.I):
            log.warning(
                '!!! Your MongoDB-compatible deployment does not support time series collections. '
                'Time series preferences will be removed from internal model definitions.'
            )

            for cls in initializer.document_models:
                if settings := getattr(cls, 'Settings', None):
                    if hasattr(settings, 'timeseries'):
                        delattr(settings, 'timeseries')

            await initializer
        else:
            raise

    await Cfg.upsert_builtins()
    await Cfg.export_to_environ()

    hostname = socket.gethostname()
    hostname, aliases, addresses = socket.gethostbyname_ex(hostname)

    heartbeat = Heartbeat(
        version=version,
        appname=appname,
        hostname=hostname,
        addresses=addresses,
    )
    await heartbeat.upsert()

    if export_cfg_to_environ_every:
        # Synchronize os.environ with database-provided variables
        task = Cfg.export_to_environ_forever(export_cfg_to_environ_every)
        tasks.add(asyncio.create_task(task, name='cfgsync'))

    if heartbeat_every:
        # Put the version and appname to the database every N seconds
        task = heartbeat.heartbeat_forever(heartbeat_every)
        tasks.add(asyncio.create_task(task, name='heartbeat'))

    for doctype in initializer.document_models:
        if issubclass(doctype, AppDocument):
            task = asyncio.create_task(doctype.post_init())
            task.add_done_callback(tasks.discard)
            tasks.add(task)


class IndexModelField(_IndexModelField):
    def __init__(self, index: IndexModel):
        self.index = index
        self.name = index.document["name"]

        self.fields = tuple(sorted(self.index.document["key"]))
        self.options = tuple(
            sorted(
                (k, v)
                for k, v in self.index.document.items()
                if k not in {'key', 'v', 'ns', 'requiresReIndex'}
            )
        )


class BeanieInitializer(Initializer):
    def __init__(self, *args, defer_index_creation=True, **kwargs):
        super().__init__(*args, **kwargs)
        self.defer_index_creation = defer_index_creation

    # Copypasted and patched method from Beanie source
    async def init_indexes(self, cls: type[Document], allow_index_dropping: bool = False):
        """
        Async indexes initializer
        """
        collection = cls.get_motor_collection()
        document_settings = cls.get_settings()

        index_information = await collection.index_information()

        old_indexes: list[IndexModelField] = IndexModelField.from_motor_index_information(index_information)
        new_indexes = []

        # Indexed field wrapped with Indexed()
        indexed_fields = (
            (k, fvalue, get_index_attributes(fvalue))
            for k, fvalue in get_model_fields(cls).items()
        )
        found_indexes = [
            IndexModelField(
                IndexModel(
                    [
                        (
                            fvalue.alias or k,
                            indexed_attrs[0],
                        )
                    ],
                    **indexed_attrs[1],
                )
            )
            for k, fvalue, indexed_attrs in indexed_fields
            if indexed_attrs is not None
        ]

        if document_settings.merge_indexes:
            result: list[_IndexModelField] = []
            for subclass in reversed(cls.mro()):
                if issubclass(subclass, Document) and not subclass == Document:
                    if subclass not in self.inited_classes and not subclass == cls:
                        await self.init_class(subclass)
                    if subclass.get_settings().indexes:
                        result = IndexModelField.merge_indexes(result, subclass.get_settings().indexes)
            found_indexes = IndexModelField.merge_indexes(found_indexes, result)

        else:
            if document_settings.indexes:
                found_indexes = IndexModelField.merge_indexes(found_indexes, document_settings.indexes)

        new_indexes += found_indexes
        delete_indexes = IndexModelField.list_difference(old_indexes, new_indexes)
        create_indexes = IndexModelField.list_difference(new_indexes, old_indexes)

        # delete indexes
        # Only drop indexes if the user specifically allows for it
        if allow_index_dropping:
            for index in delete_indexes:
                try:
                    log.warning('INDEX: Drop index %s for <%s>', index.name, collection.name)
                    await collection.drop_index(index.name)
                except OperationFailure as e:
                    if e.code == 27:
                        log.warning('INDEX: Suppress IndexNotFound error: %s', e)
                    else:
                        raise

        if create_indexes:
            if self.defer_index_creation:
                task = asyncio.create_task(
                    try_create_indexes(collection, create_indexes, retries=5)
                )
                task.add_done_callback(tasks.discard)
                tasks.add(task)
            else:
                await try_create_indexes(collection, create_indexes)


async def try_create_indexes(
    collection: AsyncIOMotorCollection,
    indexes: list[IndexModelField],
    retries: int = 0,
):
    for i in range(retries or 1):
        try:
            await collection.create_indexes(
                IndexModelField.list_to_index_model(indexes),
            )
            log.warning(
                'INDEX: Created index(es) %s for <%s>',
                ', '.join(i.name for i in indexes),
                collection.name,
            )
            return
        except OperationFailure as e:
            if not retries:
                raise

            log.error(
                'INDEX: An error occured during index creation for <%s>, attempt %i/%i: %s',
                collection.name,
                i + 1,
                retries,
                e,
            )
            await asyncio.sleep(60 ** (1 + i / 8))


