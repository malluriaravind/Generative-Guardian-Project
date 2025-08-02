from dataclasses import dataclass
import logging
import datetime
import re

from typing import *
from functools import wraps
from asyncio import iscoroutinefunction
from collections.abc import Collection
from itertools import combinations
from contextvars import ContextVar, Token as ContextToken
from pydantic import BaseModel, PlainSerializer, AfterValidator, model_validator
from pydantic_extra_types.color import Color

from beanie import Document, UpdateResponse
from pymongo import IndexModel
from pymongo.results import UpdateResult
from beanie.odm.utils.encoder import Encoder

from trussed.utils.cache import lru_cache


T = TypeVar('T')
P = ParamSpec('P')

log = logging.getLogger(__name__)
float3 = Annotated[float, PlainSerializer(lambda x: round(x, 3))]


def filter_least_prefix(scopes: Iterable[str]) -> list[str]:
    """Filter out scopes that are prefixes of others.
    For example, if scopes are ['/a/b/c', '/a/b/c/d', '/a/b/'], the result will be ['/a/b/c/d/'].
    """
    scopes_set = {*scopes}

    for a, b in combinations(scopes, 2):
        if a.startswith(b):
            scopes_set.discard(b)
        elif b.startswith(a):
            scopes_set.discard(a)

    return [*scopes_set]


@lru_cache(maxsize=1024)
def prefix_regex(prefix: str) -> Pattern[str]:
    return re.compile('^' + re.escape(prefix))


def NormalizeScope():
    def slashify(x: str):
        return f"/{'/'.join(filter(None, x.split('/')))}/"

    return AfterValidator(slashify)


ScopePath = Annotated[str, NormalizeScope()]


class Scopes:
    scopes: list[ScopePath] | None = None


def get_context_scopes():
    if (scoped_context := AppDocument.scoped_context.get()) is not None:
        return scoped_context.scopes or []
    
    return []


@dataclass(slots=True)
class ScopedContext:
    scopes: list[str] | None = None
    enable: bool = True
    disable_for: Collection[type['AppDocument']] = ()


@dataclass(slots=True, init=False)
class Unscoped:
    '''
    A context manager to temporarily disable imposed context scopes, either globally or for specific AppDocument types.

    Usage:
        with Unscoped(SomeAppDocumentType):
            "context scoping is disabled for SomeAppDocumentType within this block"
    '''
    doctypes: tuple[type['AppDocument'], ...]
    token: ContextToken[ScopedContext | None] | None

    def __init__(self, *doctypes: type['AppDocument']):
        self.doctypes = doctypes
        self.token = None
    
    def __call__(self, f: Callable[P, T]) -> Callable[P, T]:
        """
        Use the instance as a decorator. When the decorated function is called,
        it creates a context using the current instance's type and doctypes, executes the function within
        that context, and returns the result.

        Args:
            f (Callable[P, T]): The function to be decorated.

        Returns:
            Callable[P, T]: The wrapped function that executes within the context.
        """
        if iscoroutinefunction(f):
            @wraps(f)
            async def wrapper(*args, **kwargs): # type: ignore
                with type(self)(*self.doctypes):
                    return await f(*args, **kwargs)
        else:
            @wraps(f)
            def wrapper(*args, **kwargs):
                with type(self)(*self.doctypes):
                    return f(*args, **kwargs)

        return cast(Callable[P, T], wrapper)

    def __enter__(self):
        if (parent := AppDocument.scoped_context.get()) is not None:
            scoped_context = ScopedContext(
                scopes=parent.scopes,
                enable=parent.enable if self.doctypes else False,
                disable_for={*parent.disable_for, *self.doctypes},
            )

            self.token = AppDocument.scoped_context.set(scoped_context)

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self.token is not None:
            AppDocument.scoped_context.reset(self.token)


scoped_context = ContextVar[ScopedContext | None]('scoped_context', default=None)


class AppDocument(Document):
    custom_encoder: ClassVar[Encoder]
    document_models: ClassVar[list[type['AppDocument']]] = []

    scoped_context: ClassVar[ContextVar[ScopedContext | None]] = scoped_context
    scoped_context_field: ClassVar[str] = 'scopes'
    scoped_context_enable: ClassVar[bool] = False # Override it in subclasses as needed

    scopes: list[ScopePath] | None = None

    @classmethod
    def set_scoped_context(cls, scopes: Iterable[str]):
        scoped_context = ScopedContext(scopes=[*scopes])
        cls.scoped_context.set(scoped_context)
        return scoped_context

    # (Ab)use Beanie's private method
    @classmethod
    def _add_class_id_filter(cls, args: tuple, with_children: bool = False):
        args = super()._add_class_id_filter(args, with_children=with_children)

        if cls.scoped_context_enable:
            if (scoped_context := cls.scoped_context.get()) is not None:
                if scoped_context.enable:
                    if cls not in scoped_context.disable_for:
                        if scoped_context.scopes:
                            scopes = ['/ALL/', *map(prefix_regex, scoped_context.scopes)]
                        else:
                            scopes = ['/ALL/']

                        args += ({cls.scoped_context_field: {'$in': scopes}},)

        return args

    def __init_subclass__(cls, **kwargs):
        cls.Settings = getattr(cls, 'Settings', type('Settings', (), {}))

        cls.Settings.bson_encoders = getattr(cls.Settings, 'bson_encoders', {})
        cls.Settings.bson_encoders.setdefault(Color, Color.as_hex)
        cls.Settings.bson_encoders.setdefault(datetime.date, datetime.date.isoformat)
        cls.Settings.bson_encoders.setdefault(datetime.time, datetime.time.isoformat)
        cls.Settings.bson_encoders.setdefault(datetime.datetime, lambda x: x)

        if getattr(cls.Settings, 'name', None) is None:
            cls.Settings.name = cls.__name__.lower()

        if getattr(cls.Settings, 'keep_nulls', None) is None:
            cls.Settings.keep_nulls = False

        super().__init_subclass__(**kwargs)

        cls.custom_encoder = Encoder(
            to_db=True,
            keep_nulls=cls.Settings.keep_nulls,
            custom_encoders=cls.Settings.bson_encoders,
        )

        cls.document_models.append(cls)
        log.info(f'Defined Beanie document: {cls.__name__} ({cls.Settings.name})')
    
    @classmethod
    async def post_init(cls):
        pass

    @classmethod
    def get_collection_name(cls) -> str:
        name = cls.get_settings().name
        assert name, 'Collection name is not set'
        return name

    @overload
    @classmethod
    async def update_one_from(
        cls,
        filter,
        source: BaseModel,
    ) -> UpdateResult: ...

    @overload
    @classmethod
    async def update_one_from(  # noqa: F811
        cls,
        filter,
        source: BaseModel,
        response_type: Literal[UpdateResponse.UPDATE_RESULT],
    ) -> UpdateResult: ...

    @overload
    @classmethod
    async def update_one_from(  # noqa: F811
        cls,
        filter,
        source: BaseModel,
        response_type: Literal[UpdateResponse.NEW_DOCUMENT],
        **kwargs,
    ) -> Self | None: ...

    @overload
    @classmethod
    async def update_one_from(  # noqa: F811
        cls,
        filter,
        source: BaseModel,
        response_type: Literal[UpdateResponse.OLD_DOCUMENT],
        **kwargs,
    ) -> Self | None: ...

    @classmethod
    async def update_one_from(  # noqa: F811
        cls,
        filter,
        source: BaseModel,
        response_type=UpdateResponse.UPDATE_RESULT,
        **kwargs,
    ):
        fields = cls.custom_encoder.encode(source)

        return await cls.find_one(filter).update_one(
            {'$set': fields},
            response_type=response_type,
            **kwargs,
        )



class BaseCreateModel(BaseModel, Scopes):
    @model_validator(mode='after')
    def ensure_scopes_set(self):
        if not self.scopes:
            self.scopes = filter_least_prefix(get_context_scopes())

        return self


class BaseUpdateModel(BaseModel, Scopes):
    @model_validator(mode='after')
    def ensure_scopes_set(self):
        if not self.scopes:
            self.scopes = filter_least_prefix(get_context_scopes())

        return self
