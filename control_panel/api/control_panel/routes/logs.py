import logging
import http
import zlib
import io
import csv
import orjson

from typing import Any, Literal, Annotated, ClassVar, Iterable
from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from beanie import PydanticObjectId

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from trussed.env import env
from trussed.models.logrecord import Log, BaseLog, LogSearchQuery, LogSort
from trussed.models.aggregation import BaseAggregation, Push
from trussed.models.llm import Llm
from trussed.models.apikey import Apikey
from trussed.models.cfg import Cfg
from trussed.models.usagestats import TimeRange
from ..deps.auth import GetAuth, AcAPIRouter


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/logs', tags=['Logging'])
router.ac_allow_global_permission_for = {Log, Apikey, Llm}


class LogDto(BaseLog, extra='allow'):
    id: PydanticObjectId = Field(alias='_id')

    @model_validator(mode='after')
    def ensure_fields(self):
        if self.name == 'tc.reqres':
            self.message = orjson.dumps(self.raw_request or self.raw_response).decode()

            if len(self.message) > 128:
                self.message = self.message[:128] + '...'

        return self


class LogSearchRequest(LogSearchQuery):
    time: Annotated[TimeRange, Depends()]


class ReqresLog(BaseAggregation):
    id: PydanticObjectId = Field(alias='_id')
    created_at: datetime
    request_id: str
    levelname: str
    levelno: int
    side: str | None = None
    provider: str | None = None
    key_id: PydanticObjectId | None = None
    llm_id: PydanticObjectId | None = None
    dev_id: str | None = None
    app: dict | None = None
    llm: dict | None = None
    raw_request: Any | None = None
    raw_response: Any | None = None
    raw_response_code: int | None = None
    raw_response_is_error: bool | None = False
    policies: list[str] | None = None
    model: str = ''
    model_alias: str = ''

    @model_validator(mode='after')
    def ensure_fields(self):
        if self.side == 'LHS':
            self.model = self.model_alias

        return self


class ReqLogSearchRequest(LogSearchRequest):
    request_id: str
    sort: LogSort = '+created_at'


LogExportFormat = Literal[
    'csv:excel',
    'csv:excel-tab',
]

class GlobalLogSettings(BaseModel):
    retention_hours: float = 24*7*4
    export_format: LogExportFormat = 'csv:excel'

    async def to_cfg(self):
        if var := await Cfg.find_one({'name': 'LOGGING_RETENTION_HOURS'}):
            var.value = str(self.retention_hours)
            await var.save()

    def update_by_env(self):
        self.retention_hours = env.float('LOGGING_RETENTION_HOURS', self.retention_hours)
        return self

settings = GlobalLogSettings()


class CompactLog(BaseLog):
    keywords: ClassVar[None] = None


class DescriptiveLogLevel(BaseModel):
    name: str
    level: int


class DescriptiveStatusCode(BaseModel):
    name: str
    value: int

    @classmethod
    def make(cls, codes: Iterable[int] = ()):
        codes = codes or (200, 400, 401, 403, 404, 422, 500, 502, 503)

        for i in codes:
            status = http.HTTPStatus(i)
            yield DescriptiveStatusCode(name=f'{i} {status.phrase}', value=i)


class DescriptiveLogDuration(BaseModel):
    name: str
    hours: float


class DescriptiveLogExportFormat(BaseModel):
    name: str
    value: str


class DescriptiveField(BaseModel):
    name: str
    title: str = ''
    show: bool = False


descripted_fields_map = {
    i.name: i
    for i in [
        DescriptiveField(name='message', show=False),
        DescriptiveField(name='levelname', title='Level', show=False),
        DescriptiveField(name='created_at', title='Created At', show=True),
        DescriptiveField(name='raw_request'),
        DescriptiveField(name='raw_response'),
        DescriptiveField(name='policies', title='Policies', show=True),
        DescriptiveField(name='dev_id', title='User ID', show=True),
        DescriptiveField(name='levelname', title='Level', show=False),
        DescriptiveField(name='_id', title='ID'),
        DescriptiveField(name='exc_text', title='Error Stack Trace', show=True),
    ]
}

descriptive_log_levels = [
    DescriptiveLogLevel(name='TC_CRITICAL', level=50),
    DescriptiveLogLevel(name='TC_ERROR', level=40),
    DescriptiveLogLevel(name='TC_WARNING', level=30),
    DescriptiveLogLevel(name='TC_INFO', level=20),
    DescriptiveLogLevel(name='TC_DEBUG', level=10),
]

descriptive_log_durations = [
    DescriptiveLogDuration(name='Until Disabled', hours=0),
    DescriptiveLogDuration(name='1 Hour', hours=1),
    DescriptiveLogDuration(name='4 Hours', hours=4),
    DescriptiveLogDuration(name='24 Hours', hours=24),
    DescriptiveLogDuration(name='1 Week', hours=24*7),
]

descriptive_log_retentions = [
    DescriptiveLogDuration(name='1 Hour', hours=1),
    DescriptiveLogDuration(name='4 Hours', hours=4),
    DescriptiveLogDuration(name='24 Hours', hours=24),
    DescriptiveLogDuration(name='1 Week', hours=24*7),
    DescriptiveLogDuration(name='4 Weeks', hours=24*7*4),
]

descriptive_export_formats = [
    DescriptiveLogExportFormat(name='CSV (Excel)', value='csv:excel'),
    DescriptiveLogExportFormat(name='CSV (Excel TAB)', value='csv:excel-tab'),
]


@router.get('/descriptive-durations', dependencies=[GetAuth(check_rbac=False)])
async def log_durations() -> list[DescriptiveLogDuration]:
    return descriptive_log_durations


@router.get('/descriptive-retentions', dependencies=[GetAuth(check_rbac=False)])
async def log_retentions() -> list[DescriptiveLogDuration]:
    return descriptive_log_retentions


@router.get('/descriptive-fields', dependencies=[GetAuth(check_rbac=False)])
async def log_fields() -> list[DescriptiveField]:
    undescripted_fields = Log.model_fields.keys() - descripted_fields_map.keys()

    descripted = [*descripted_fields_map.values()]
    undescripted = [DescriptiveField(name=i) for i in undescripted_fields]
    return descripted + undescripted


@router.get('/descriptive-levels', dependencies=[GetAuth(check_rbac=False)])
async def descriptive_levels() -> list[DescriptiveLogLevel]:
    return descriptive_log_levels


@router.get('/descriptive-codes', dependencies=[GetAuth(check_rbac=False)])
async def descriptive_codes() -> list[DescriptiveStatusCode]:
    return [*DescriptiveStatusCode.make()]


@router.get('/descriptive-export-formats', dependencies=[GetAuth(check_rbac=False)])
async def export_formats() -> list[DescriptiveLogExportFormat]:
    return descriptive_export_formats


@router.get('/settings/fetch', dependencies=[GetAuth()])
async def get_settings() -> GlobalLogSettings:
    settings.update_by_env()
    return settings


@router.post('/settings/update', dependencies=[GetAuth()])
async def update_settings(settings: GlobalLogSettings) -> GlobalLogSettings:
    await settings.to_cfg()
    globals()['settings'] = settings
    return settings


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch_logs(query: LogSearchRequest = Depends()) -> list[LogDto]:
    return (
        await query(projection_model=LogDto)
        .sort(query.sortby())
        .limit(query.limit)
        .to_list()
    )


class GroupedReqresLog(BaseAggregation):
    request_id: str = Field(alias='_id')

    first: Annotated[ReqresLog, {'$last': '$$ROOT'}]
    last: Annotated[ReqresLog, {'$first': '$$ROOT'}]

    @classmethod
    def make_group_id(cls, *args, **kwargs):
        return '$request_id'

    def get(self) -> ReqresLog:
        requestlog, responselog = self.first, self.last

        requestlog.raw_response = responselog.raw_response
        requestlog.raw_response_is_error = responselog.raw_response_is_error
        requestlog.provider = responselog.provider
        requestlog.model = responselog.model
        requestlog.model_alias = responselog.model_alias
        requestlog.policies = responselog.policies
        return requestlog


@router.get('/reqres/fetch', dependencies=[GetAuth()])
async def fetch_logs2(query: LogSearchRequest = Depends()) -> list[ReqresLog]:
    query.reqres = True

    pipeline = [
        *GroupedReqresLog.stage_sort('-created_at'),
        *GroupedReqresLog.stage_group(),
        *GroupedReqresLog.stage_sort('-first.created_at'),
    ]

    q = query().limit(query.limit).aggregate(pipeline, GroupedReqresLog)
    return [i.get() async for i in q]


@router.get('/reqres', dependencies=[GetAuth()])
async def fetch_flow(query: ReqLogSearchRequest = Depends()):
    query.reqres = True

    pipeline = [
        *ReqresLog.stage_join(
            Llm.get_collection_name(),
            fields=('name', 'color', 'provider'),
            local='llm_id',
            to='llm',
        ),
        *ReqresLog.stage_join(
            Apikey.get_collection_name(),
            fields=('name', 'color'),
            local='key_id',
            to='app',
        ),
    ]
    q = query().sort(query.sortby()).limit(query.limit).aggregate(pipeline, ReqresLog)
    return await q.to_list()


@router.get('/export', dependencies=[GetAuth()])
async def export(request: Request, query: LogSearchRequest = Depends()):
    """
    Export logs in CSV format.

    Supports gzip compression, if the client sends "gzip" in the
    `Accept-Encoding` header.

    Returns a streaming response with a Content-Disposition header
    set to "attachment; filename=trussed-logs.csv"
    """
    settings.update_by_env()

    headers = {'Content-Disposition': 'attachment; filename="trussed-logs.csv"'}
    dialect = settings.export_format.partition(':')[-1]
    compressor = None

    if 'gzip' in request.headers.get('Accept-Encoding', ''):
        compressor = zlib.compressobj(8, wbits=zlib.MAX_WBITS | 16)
        headers['Content-Encoding'] = 'gzip'

    stream = csv_stream_export(query, dialect, compressor=compressor)
    return StreamingResponse(stream, 200, headers, media_type='text/csv')


async def csv_stream_export(
    query: LogSearchQuery,
    dialect='excel',
    compressor: Any | None = None,
    chunksize: int = 1024 * 128,
):
    file = io.StringIO()
    fieldnames = [*CompactLog.model_fields.keys()]

    writer = csv.DictWriter(file, fieldnames, dialect=dialect, extrasaction='ignore')
    writer.writeheader()

    compress, flush = wrap_zlib_compressor(compressor)

    async for log in query(projection_model=CompactLog).sort(query.sortby()):
        dump = log.model_dump()

        for k, v in dump.items():
            if isinstance(v, dict):
                dump[k] = orjson.dumps(v).decode()

        writer.writerow(dump)

        if len(file.getvalue()) > chunksize:
            yield compress(file.getvalue().encode())
            file.truncate(0)
            file.seek(0)

    yield flush(file.getvalue().encode())


def wrap_zlib_compressor(lz: Any = None):
    def compress(data: bytes) -> bytes:
        return lz.compress(data)

    def flush(data: bytes) -> bytes:
        if data:
            return lz.compress(data) + lz.flush()

        return lz.flush()

    if lz is not None:
        return compress, flush
    else:
        return bytes, bytes


