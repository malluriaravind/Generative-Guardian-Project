import logging
import warnings
import asyncio
import regex
import orjson

from typing import Any, Callable, Literal, Self, ClassVar, override
from datetime import datetime, timedelta
from pymongo.errors import OperationFailure
from pydantic import BaseModel, ValidationError
from beanie import PydanticObjectId, SortDirection
from beanie.odm.queries.find import FindMany
from pymongo import IndexModel, UpdateOne

from ..env import env
from . import AppDocument
from .llm import LlmProvider
from .usagestats import TimeRange
from ..utils.queue import LmdbQueue


logger = logging.getLogger(__name__)
# Remove "at 0x7a4bd74c81c0" from messages to prevent warnings being repeated
at0x = regex.compile(r' at 0x[0-9a-fA-F]+')


Side = Literal['LHS', 'RHS']


class BaseLog(BaseModel, extra='ignore'):
    message: str
    levelno: int
    levelname: str
    name: str
    pathname: str
    filename: str
    module: str
    funcName: str
    lineno: int

    created_at: datetime
    expires_at: datetime | None = None

    appname: str | None = None
    appversion: str | None = None
    keywords: list[str] | None = None

    key_id: PydanticObjectId | None = None
    llm_id: PydanticObjectId | None = None
    dev_id: str | None = None

    exc_text: str | None = None

    request_id: str | None = None
    http_addr: str | None = None
    http_method: str | None = None
    http_path: str | None = None
    http_query: str | None = None
    http_full_path: str | None = None
    http_status_code: int | None = None
    request_start: datetime | None = None
    request_time_ms: float | None = None
    processing_time_ms: float | None = None

    side: str | None = None
    "LHS or RHS"

    provider: LlmProvider | None = None
    model: str | None = None
    model_alias: str | None = None
    raw_request: Any | None = None
    raw_response: Any | None = None


class Log(BaseLog, AppDocument, extra='allow'):
    scoped_context_enable: ClassVar[bool] = True
    special_keywords_names: ClassVar[tuple[str, ...]] = (
        'name',
        'request_id',
        'key_id',
        'llm_id',
        'dev_id',
        'http_status_code',
        'side',
    )

    class Settings:
        indexes = [
            IndexModel(['created_at']),
            IndexModel(['keywords']),
            # We have a bit of time to do something about expired logs before they are deleted
            IndexModel(['expires_at'], expireAfterSeconds=60*5),
        ]

    @classmethod
    def from_log_record(cls, record: dict) -> Self | None:
        try:
            data = {**record}
            data['created_at'] = data.pop('created')
            data.pop('args', None)

            log = cls.model_validate(data)

            if retention_hours := env.float('LOGGING_RETENTION_HOURS', 0):
                log.expires_at = log.created_at + timedelta(hours=retention_hours)

            # If raw request body was logged, try to decode
            if isinstance(log.raw_request, bytes):
                try:
                    log.raw_request = orjson.loads(log.raw_request)
                except ValueError:
                    pass

            if log.name == 'tc.reqres':
                if retention_days := env.float('LOGGING_AUDIT_RETENTION_DAYS', 0):
                    log.expires_at = log.created_at + timedelta(days=retention_days)

                if log.raw_request:
                    log.levelname = 'TC_REQUEST'
                    #log.message = orjson.dumps(log.raw_request).decode()

                elif log.raw_response:
                    log.levelname = 'TC_RESPONSE'
                    #log.message = orjson.dumps(log.raw_response).decode()

            log.keywords = log.make_keywords(with_message=log.name != 'tc.reqres')

            return log
        except ValidationError as e:
            logger.error(f'Unable to validate log record: {e}')

    def force_encode(self) -> dict | None:
        try:
            return self.custom_encoder.encode(self)
        except Exception as e:
            warnings.warn(at0x.sub('', f'Unable to encode log record: {e}'))

            try:
                if self.model_extra:
                    self.model_extra.clear()

                return self.custom_encoder.encode(self)
            except Exception as e:
                logger.error(f'Unable to encode log entry without extras: {e}')

    def make_keywords(self, with_message = True):
        keywords = [
            self.appname,
            self.appversion,
            self.name,
            self.levelname,
            self.module,
            self.funcName,
            self.request_id,
            self.http_addr,
            self.http_method,
            self.http_full_path,
        ]

        special_keywords = [
            f'!{kw}:{v}'
            for kw in self.special_keywords_names
            if (v := getattr(self, kw, None)) is not None
        ]

        if with_message:
            message_keywords = regex.findall(r'\p{L}+', self.message.lower())
        else:
            message_keywords = []

        keywords = {
            *filter(None, keywords),
            *special_keywords,
            *message_keywords,
        }
        return [*keywords]


LogSort = Literal[
    '+created_at',
    '-created_at',
]

LogSortSign = {
    '+': SortDirection.ASCENDING,
    '-': SortDirection.DESCENDING,
}

class LogSearchQuery(BaseModel):
    time: TimeRange
    keywords: str = ''
    request_id: str = ''
    level: int = 0
    app: str = ''
    llm: str = ''
    dev: str = ''
    method: str = ''
    status: int = 0
    reqres: bool = False
    prompts: bool = False
    responses: bool = False
    sort: LogSort = '-created_at'
    limit: int = 50

    def sortby(self):
        return (self.sort[1:], LogSortSign[self.sort[0]])

    def __call__[T: FindMany, **P](
        self,
        find: Callable[P, T] = Log.find,
        *args: P.args,
        **kwargs: P.kwargs,
    ) -> T:
        q = [
            {
                'created_at': {'$gt': self.time.begin, '$lt': self.time.end},
                'levelno': {'$gte': self.level},
            },
            *[{'keywords': i} for i in self.keywords.split()],
        ]

        if self.request_id:
            q.append({'keywords': f'!request_id:{self.request_id}'})

        if self.app:
            q.append({'keywords': f'!key_id:{self.app}'})

        if self.llm:
            q.append({'keywords': f'!llm_id:{self.llm}'})

        if self.dev:
            q.append({'keywords': f'!dev_id:{self.dev}'})

        if self.method:
            q.append({'keywords': f'{self.method}'}) # No prefix

        if self.status:
            q.append({'keywords': f'!http_status_code:{self.status}'})
        
        if self.prompts and self.responses:
            self.reqres = True
        else:
            if self.prompts:
                q.append({'keywords': 'TC_REQUEST'})

            if self.responses:
                q.append({'keywords': 'TC_RESPONSE'})

        if self.reqres:
            q.append({'keywords': '!name:tc.reqres'})
    
        return find(*q, *args, **kwargs)



class LmdbQueueLogConsumer(LmdbQueue[dict]):
    def __init__(self, path='persist/queue.logs/', sync=False):
        super().__init__(path, sync=sync)
        self.batch_size = 25

    @override
    async def save(self, records: list[dict]):
        ops = []

        for i in records:
            if (log := Log.from_log_record(i)) is not None:
                if (doc := log.force_encode()) is not None:
                    ops.append(UpdateOne({'_id': doc.get('_id')}, {'$set': doc}, upsert=True))

        if ops:
            try:
                await Log.get_motor_collection().bulk_write(ops)
            except OperationFailure as e:
                i = 1
                sleep = 0

                if e.details:
                    for i, werror in enumerate(e.details.get("writeErrors", []), 1):
                        if werror.get('code') == 16500:
                            sleep = 1
                        else:
                            raise

                if sleep or e.code == 16500:
                    logger.warning(f'Could not save {i} log records, rate exceeded. Retry')
                    await asyncio.sleep(sleep)
                    return False
                else:
                    raise
