import logging

from typing import Any
from operator import attrgetter
from pydantic import BaseModel, Field, computed_field
from bson import ObjectId
from beanie import PydanticObjectId, SortDirection
from fastapi import APIRouter, Depends

from trussed.models.usage import Usage
from trussed.models.llm import Llm, LlmProvider
from trussed.models.pool import ModelPool
from trussed.models.apikey import Apikey
from trussed.models.usagestats import *
from ..deps.auth import GetAuth, AcAPIRouter


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/utilization', tags=['Utilization statistics'])
router.ac_namespace = '/stats/'
router.ac_allow_global_permission_for = {Usage, Apikey, Llm, ModelPool}


class UtilizationTotals(BaseUsageStats, extra='allow'):
    id: Any = Field(alias='_id', default=None, exclude=True)

    avg_response_time: Annotated[Avg, '$response_time'] = 0
    max_response_time: Annotated[Max, '$response_time'] = 0

    prompt_tokens: Annotated[Sum, '$prompt_tokens'] = 0
    completion_tokens: Annotated[Sum, '$completion_tokens'] = 0
    avg_total_tokens: Annotated[Avg, '$total_tokens'] = 0

    policy_count: Annotated[Sum, '$policy_count']
    policy_triggered: Annotated[Sum, '$policy_triggered']

    errors: Annotated[Sum, '$is_error'] = 0
    warnings: Annotated[Sum, '$is_warning'] = 0
    prompts: Count = 0


class UtilizedLlm(BaseUsageStats):
    id: PydanticObjectId | None = Field(alias='_id', default=None)
    name: str | None = 'Non-existent'

    @classmethod
    def make_group_id(cls, *args, **kwargs):
        return {'_id': '$metadata.llm_id'}


class UtilizedModel(BaseUsageStats):
    id: Any = Field(alias='_id', default=None, exclude=True)
    model: str | None = None

    @classmethod
    def make_group_id(cls, *args, **kwargs):
        return {'model': '$metadata.model'}


class UtilizedPool(BaseUsageStats):
    id: PydanticObjectId | None = Field(alias='_id', default=None)
    name: str | None = None
    virtual_model_name: str | None = None

    @classmethod
    def make_group_id(cls, *args, **kwargs):
        return {'_id': '$metadata.pool_id'}


class UtilizedApp(BaseUsageStats):
    id: PydanticObjectId | None = Field(alias='_id', default=None)
    name: str | None = None

    @classmethod
    def make_group_id(cls, *args, **kwargs):
        return {'_id': '$metadata.key_id'}


class UtilizedTags(BaseUsageAggregation):
    tags: Annotated[list[str], '$addToSet', '$metadata.tags', NullTo(list)]


class UtilizedDevIds(BaseUsageAggregation):
    dev_ids: Annotated[list[str], '$addToSet', '$metadata.dev_id', NullTo(list)]


class UtilizationTotalsDto(BaseModel):
    class ResponseTime(BaseModel):
        average_ms: int = 0
        peak_ms: int = 0

    class Tokens(BaseModel):
        prompt: int = 0
        completion: int = 0
        average: int = 0
    class Policies(BaseModel):
        total: int = 0

    reponse_time: ResponseTime = Field(default_factory=ResponseTime)
    tokens: Tokens = Field(default_factory=Tokens)
    policies: Policies = Field(default_factory=Policies)

    errors: int = 0
    warnings: int = 0
    prompts: int = 0


def query(
    dtrange: TimeRange | None = None,
    is_error: int | None = None,
    app_id: ObjectId | None = None,
    llm_id: ObjectId | None = None,
    pool_id: ObjectId | None = None,
    provider: str | None = None,
    model: str | None = None,
    tag: str | None = None,
):
    q: dict[str, Any] = {}

    if dtrange is not None:
        q['timestamp'] = {'$gt': dtrange.begin, '$lt': dtrange.end}

    if is_error is not None:
        q['is_error'] = is_error

    if app_id is not None:
        q['metadata.key_id'] = app_id

    if llm_id is not None:
        q['metadata.llm_id'] = llm_id

    if pool_id is not None:
        q['metadata.pool_id'] = pool_id

    if provider is not None:
        q['metadata.provider'] = provider

    if model is not None:
        q['metadata.model'] = model

    if tag is not None:
        q['metadata.tags'] = tag

    return Usage.find(q)


@router.get('/apps', dependencies=[GetAuth()])
async def fetch_apps(
    time: TimeRange = Depends(),
    llm: PydanticObjectId | None = None,
    tag: str | None = None,
):
    pipeline = [
        *UtilizedApp.stage_match(time=time, llm_id=llm, tag=tag),
        *UtilizedApp.stage_group(),
        *UtilizedApp.stage_join(Apikey.get_collection_name(), ('name',)),
        *UtilizedApp.stage_merge_objects('$_id'),
    ]

    if apps := await UtilizedApp.aggregate(pipeline, Usage):
        return [*filter(attrgetter('name'), apps.get_aggregated_list())]

    return []


@router.get('/llms', dependencies=[GetAuth()])
async def fetch_llms(
    time: TimeRange = Depends(),
    app: PydanticObjectId | None = None,
    tag: str | None = None,
):
    pipeline = [
        *UtilizedLlm.stage_match(time=time, app_id=app, tag=tag),
        *UtilizedLlm.stage_group(),
        *UtilizedLlm.stage_join(Llm.get_collection_name(), ('name',)),
        *UtilizedLlm.stage_merge_objects('$_id'),
    ]

    if llms := await UtilizedLlm.aggregate(pipeline, Usage):
        return llms.get_aggregated_list()

    return []


@router.get('/pools', dependencies=[GetAuth()])
async def fetch_pools(time: TimeRange = Depends()):
    pipeline = [
        *UtilizedPool.stage_match(time=time),
        *UtilizedPool.stage_group(),
        *UtilizedPool.stage_join(
            ModelPool.get_collection_name(),
            ('name', 'virtual_model_name'),
        ),
        *UtilizedPool.stage_merge_objects('$_id'),
    ]

    if pools := await UtilizedPool.aggregate(pipeline, Usage):
        return [*filter(attrgetter('name'), pools.get_aggregated_list())]

    return []


@router.get('/tags', dependencies=[GetAuth()])
async def fetch_tags(
    time: TimeRange = Depends(),
    app: PydanticObjectId | None = None,
    llm: PydanticObjectId | None = None,
):
    pipeline = [
        *UtilizedTags.stage_match(time=time, app_id=app, llm_id=llm),
        *UtilizedTags.stage_group(),
        *UtilizedTags.stage_flatten_set('tags'),
    ]

    if tags := await UtilizedTags.aggregate(pipeline, Usage):
        return tags.tags

    return []


@router.get('/devs', dependencies=[GetAuth()])
async def fetch_devs(
    time: TimeRange = Depends(),
    app: PydanticObjectId | None = None,
    llm: PydanticObjectId | None = None,
):
    pipeline = [
        *UtilizedDevIds.stage_match(time=time, app_id=app, llm_id=llm),
        *UtilizedDevIds.stage_group(),
    ]

    if devs := await UtilizedDevIds.aggregate(pipeline, Usage):
        return devs.dev_ids

    return []


@router.get('/models', dependencies=[GetAuth()])
async def fetch_models(time: TimeRange = Depends()):
    pipeline = [
        *UtilizedModel.stage_match(time=time),
        *UtilizedModel.stage_group(),
        *UtilizedModel.stage_sort('name'),
    ]

    if models := await UtilizedModel.aggregate(pipeline, Usage):
        return [*filter(attrgetter('model'), models.get_aggregated_list())]

    return []



@router.get('/total', dependencies=[GetAuth()])
async def fetch_total(
    time: TimeRange = Depends(),
    provider: LlmProvider | None = None,
    app: PydanticObjectId | None = None,
    llm: PydanticObjectId | None = None,
    pool: PydanticObjectId | None = None,
    model: str | None = None,
    tag: str | None = None,
) -> UtilizationTotalsDto:
    totals = UtilizationTotalsDto()

    pipeline = [
        *UtilizationTotals.stage_match(
            time=time,
            provider=provider,
            app_id=app,
            llm_id=llm,
            pool_id=pool,
            model=model,
            tag=tag,
        ),
        *UtilizationTotals.stage_group(),
    ]

    if stats := await UtilizationTotals.aggregate(pipeline, Usage):
        totals.reponse_time.average_ms = int(stats.avg_response_time * 1000)
        totals.reponse_time.peak_ms = int(stats.max_response_time * 1000)
        totals.tokens.prompt = int(stats.prompt_tokens)
        totals.tokens.completion = int(stats.completion_tokens)
        totals.tokens.average = int(stats.avg_total_tokens)
        totals.errors = int(stats.errors)
        totals.warnings = int(stats.warnings)
        totals.prompts = stats.prompts
        totals.policies.total = int(stats.policy_triggered)

    return totals


@router.get('/aggregate/{period}', dependencies=[GetAuth()])
async def fetch_stacked(
    period: GroupByTime,
    time: TimeRange = Depends(),
    provider: LlmProvider | None = None,
    app: PydanticObjectId | None = None,
    llm: PydanticObjectId | None = None,
    pool: PydanticObjectId | None = None,
    model: str | None = None,
    tag: str | None = None,
):
    pipeline = [
        *UtilizationTotals.stage_match(
            time=time,
            provider=provider,
            app_id=app,
            llm_id=llm,
            pool_id=pool,
            model=model,
            tag=tag,
        ),
        *UtilizationTotals.stage_group(period),
        *UtilizationTotals.stage_merge_objects('$_id'),
        *UtilizationTotals.stage_sort('date'),
    ]

    if totals := await UtilizationTotals.aggregate(pipeline, Usage):
        return totals.get_aggregated_list()

    return []


@router.get('/errors', dependencies=[GetAuth()])
async def fetch_errors(
    time: TimeRange = Depends(),
    provider: LlmProvider | None = None,
    app: PydanticObjectId | None = None,
    llm: PydanticObjectId | None = None,
    pool: PydanticObjectId | None = None,
    model: str | None = None,
    tag: str | None = None,
) -> list[Usage]:
    q = query(
        is_error=1,
        dtrange=time,
        provider=provider,
        app_id=app,
        llm_id=llm,
        pool_id=pool,
        model=model,
        tag=tag,
    )
    return await q.sort(('timestamp', SortDirection.DESCENDING)).to_list()
