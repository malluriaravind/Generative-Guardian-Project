import logging

from typing import Any
from dataclasses import dataclass

from fastapi import APIRouter, Depends
from beanie import PydanticObjectId
from bson import ObjectId, encode as bson_encode
from pydantic import BaseModel, PlainSerializer, model_validator, computed_field

from . import Csv
from ..deps.auth import GetAuth, AcAPIRouter

from trussed.utils.color import object_id_color

from trussed.models.apikey import Apikey
from trussed.models.llm import Llm

from trussed.models.budget import Budget
from trussed.models.usage import *
from trussed.models.usagestats import *


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/usage', tags=['Cost statistics'])
router.ac_namespace = '/stats/'
router.ac_allow_global_permission_for = {Usage, Budget}

doctypes: dict[GroupByObject, type[AppDocument]] = {
    'app': Apikey,
    'llm': Llm,
}

MaybeObjectId = Annotated[
    Any,
    PlainSerializer(lambda x: str(x) if isinstance(x, ObjectId) else None),
]



class UsageStats(BaseUsageStats[MaybeObjectId]):
    response_time: Avg
    total_cost: Sum
    total_tokens: Sum
    name: str | None = None
    color: str | None = None
    date: str | None = None
    model: str | None = None
    previous: list['UsageStats'] = Field(default_factory=list, exclude=True)

    @model_validator(mode='after')
    def defaults(self):
        if isinstance(self.id, ObjectId):
            if not self.name:
                self.name = 'Deleted @%s' % self.id

            if not self.color:
                self.color = object_id_color(self.id)

        return self

    @computed_field
    @property
    def cost_trend(self) -> float | None:
        if self.previous:
            return self.total_cost - self.previous[0].total_cost
        else:
            return None


class UsageTotal(BaseUsageStats[MaybeObjectId], extra='allow'):
    response_time: Avg
    total_cost: Sum
    total_tokens: Sum


class Global(BaseModel):
    @dataclass
    class Tokens:
        total: float = 0
        previous_total: float = 0

    @dataclass
    class Cost:
        total: float = 0
        previous_total: float = 0

    @dataclass
    class Budget:
        total: float = 0
        forecasted: float = 0

    tokens: Tokens = Field(default_factory=Tokens)
    cost: Cost = Field(default_factory=Cost)
    budget: Budget = Field(default_factory=Budget)
    response_time_ms: int = 0


class BudgetTotal(BaseAggregation):
    budget: Sum

    @classmethod
    def make_group_id(cls, *groupby: str, **kwargs):
        return None

    @classmethod
    async def summarize(cls):
        pipeline = [
            *cls.stage_group(),
            *cls.stage_round(),
        ]
        budget = await anext(aiter(Budget.aggregate(pipeline, cls)), None)

        if budget:
            return budget.budget

        return 0


@router.get('/total', dependencies=[GetAuth()])
async def fetch_total(
    time: TimeRange = Depends(),
    tag: str | None = None,
):
    stats = Global()
    stats.budget.total = await BudgetTotal.summarize()

    pipeline = [
        *UsageTotal.stage_match(time=time, tag=tag),
        *UsageTotal.stage_group(),
    ]

    current_usage = await anext(aiter(Usage.aggregate(pipeline, UsageTotal)), None)

    if current_usage:
        stats.response_time_ms = int(current_usage.response_time * 1000)
        stats.cost.total = current_usage.total_cost
        stats.tokens.total = current_usage.total_tokens
        stats.budget.forecasted = await CostUsage.forecast_usage(
            current_usage.total_cost, time
        )
    else:
        stats.budget.forecasted = await CostUsage.forecast_usage(0, time)

    pipeline = [
        *UsageTotal.stage_match(time=time.shift(-1), tag=tag),
        *UsageTotal.stage_group(),
    ]

    previous_usage = await anext(aiter(Usage.aggregate(pipeline, UsageTotal)), None)

    if previous_usage:
        stats.cost.previous_total = previous_usage.total_cost
        stats.tokens.previous_total = previous_usage.total_tokens

    return stats


@router.get('/stacked/{period}/{by}', dependencies=[GetAuth()])
async def fetch_stacked(
    by: GroupByObject,
    period: GroupByTime,
    sort: Csv[tuple[SortBy, ...]] = ('date',),
    time: TimeRange = Depends(),
    tag: str | None = None,
    deleted: bool = False,
):
    doc = doctypes[by].get_collection_name()

    pipeline = [
        *UsageStats.stage_match(time=time, tag=tag),
        *UsageStats.stage_group(period, by),
        *UsageStats.stage_round(),
        *UsageStats.stage_join(doc, ('name', 'color'), filter_empty=not deleted),
        *UsageStats.stage_merge_objects('$_id'),
        *UsageStats.stage_sort(*sort),
    ]

    aggregated = await Usage.aggregate(pipeline, UsageStats).to_list()
    bydate = {}
    byname = {}

    for i in aggregated:
        byname[i.name] = i
        bydate.setdefault(i.date, []).append(i)

    data = [
        dict(
            name=date,
            stacks={i.name: i.total_cost for i in stats},
        )
        for date, stats in bydate.items()
    ]

    result = dict(data=data, objects=[*byname.values()])
    return result


@router.get('/{by}', dependencies=[GetAuth()])
async def fetch_by(
    by: GroupBy,
    sort: Csv[tuple[SortBy, ...]] = ('-total_cost',),
    app: PydanticObjectId | None = None,
    llm: PydanticObjectId | None = None,
    time: TimeRange = Depends(),
    tag: str | None = None,
    deleted: bool = False,
):
    stage_join = ()
    join_fields = ('name', 'color')

    if by in doctypes:
        doc = doctypes[by].get_collection_name()
        stage_join = UsageStats.stage_join(doc, join_fields, filter_empty=not deleted)

    # if app:
    #     doc = Apikey.get_collection_name()
    #     stage_join = UsageStats.stage_join(doc, join_fields, id=app)

    # if llm:
    #     doc = Llm.get_collection_name()
    #     stage_join = UsageStats.stage_join(doc, join_fields, id=llm)

    pipeline = [
        *UsageStats.stage_match(app_id=app, llm_id=llm, time=time, tag=tag),
        *UsageStats.stage_group(by),
        *stage_join,
        *UsageStats.stage_merge_objects('$_id'),
        *UsageStats.stage_sort(*sort),
    ]
    aggregated = await Usage.aggregate(pipeline, UsageStats).to_list()

    aggregated_previous = await Usage.aggregate(
        [
            *UsageStats.stage_match(
                app_id=app, llm_id=llm, time=time.shift(-1), tag=tag
            ),
            *UsageStats.stage_group(by),
            *UsageStats.stage_merge_objects('$_id'),
        ],
        UsageStats,
    ).to_list()

    def tobson(i: UsageStats):
        return bson_encode({'': i.id})

    zip_objects('previous', aggregated, aggregated_previous, key=tobson)

    return aggregated


class UsageCount(BaseUsageStats):
    count: int = 0

    @classmethod
    def stage_count(cls):
        return ({'$count': 'count'},)


@router.get('/count/prompt', dependencies=[GetAuth()])
async def countall(time: TimeRange = Depends()):
    match = UsageCount.stage_match(time=time)[0]['$match']
    return UsageCount(count=await Usage.find(match).count())


@router.get('/count/{by}', dependencies=[GetAuth()])
async def countby(by: GroupBy, time: TimeRange = Depends()):
    pipeline = [
        *UsageCount.stage_match(time=time),
        *UsageCount.stage_group(by),
        *UsageCount.stage_count(),
    ]

    if cnt := await UsageCount.aggregate(pipeline, Usage):
        return cnt

    return UsageCount()


def zip_objects(attr: str, dst, src, *, key: Callable):
    d = {}

    for i in src:
        d.setdefault(key(i), []).append(i)

    for i in dst:
        setattr(i, attr, d.get(key(i), []))

    return d


