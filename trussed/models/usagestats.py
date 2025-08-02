import logging

from typing import Literal, Callable
from pydantic.dataclasses import dataclass
from datetime import datetime, UTC
from functools import lru_cache
from itertools import chain
from pydantic import AfterValidator
import pytz

from ..ctx import ctx
from .aggregation import *
from .usage import Usage


log = logging.getLogger(__name__)

GroupByObject = Literal['app', 'llm']
GroupByModel = Literal['model', 'alias']
GroupByTime = Literal['minute', 'day', 'week', 'month']
GroupByRelated = GroupByObject | GroupByModel
GroupBy = GroupByObject | GroupByModel | GroupByTime | Literal['dev']


# fmt: off
group_ids: dict[GroupBy, Callable[..., dict]] = {
    'app':   lambda **kw: {'_id':   '$metadata.key_id'},
    'llm':   lambda **kw: {'_id':   '$metadata.llm_id'},
    'dev':   lambda **kw: {'_id':   '$metadata.dev_id'},
    'model': lambda **kw: {'model': '$metadata.model'},
    'alias': lambda **kw: {'model': '$metadata.alias'},

    'minute': lambda tz='UTC', **kw: {
        'date': {
            '$dateToString': {
                'timezone': tz,
                'date': '$timestamp',
                'format': '%Y-%m-%d %H:%M',
            }
        }
    },
    'day': lambda tz='UTC', **kw: {
        'date': {
            '$dateToString': {
                'timezone': tz,
                'date': '$timestamp',
                'format': '%Y-%m-%d',
            }
        }
    },
    'week': lambda tz='UTC', **kw: {
        'date': {
            '$dateToString': {
                'timezone': tz,
                'date': '$timestamp',
                'format': '%Y-%m %V',
            }
        }
    },
    'month': lambda tz='UTC', **kw: {
        'date': {
            '$dateToString': {
                'timezone': tz,
                'date': '$timestamp',
                'format': '%Y-%m',
            }
        }
    },
}
# fmt: on

# fmt: off
SortBy = Literal[
    '_id',           '-_id',
    'model',         '-model',
    'date',          '-date',
    'total_cost',    '-total_cost',
    'total_tokens',  '-total_tokens',
    'response_time', '-response_time',
]
# fmt: on


@dataclass(frozen=True, eq=True)
class TimeRange:
    minyear, maxyear = 2000, 3000
    min = datetime.min.replace(tzinfo=UTC, year=minyear)
    max = datetime.max.replace(tzinfo=UTC, year=maxyear)

    @staticmethod
    def normalize(dt: datetime):
        year = max(min(dt.year, TimeRange.maxyear), TimeRange.minyear)
        return dt.replace(year=year, tzinfo=dt.tzinfo or UTC)

    begin: Annotated[datetime, AfterValidator(normalize)] = min
    end: Annotated[datetime, AfterValidator(normalize)] = max

    def shift(self, n):
        delta = abs(self.end - self.begin) * n
        return type(self)(self.begin + delta, self.end + delta)


class BaseUsageAggregation[IdT](BaseAggregation[IdT]):
    @classmethod
    @lru_cache
    def stage_match(
        cls,
        *,
        time: TimeRange | None = None,
        app_id=None,
        llm_id=None,
        pool_id=None,
        provider=None,
        model=None,
        tag=None,
    ):
        q = {'$match': {}}

        if time:
            if time.begin:
                q['$match'].setdefault('timestamp', {})['$gt'] = time.begin

            if time.end:
                q['$match'].setdefault('timestamp', {})['$lt'] = time.end

        if app_id:
            q['$match']['metadata.key_id'] = app_id

        if llm_id:
            q['$match']['metadata.llm_id'] = llm_id

        if pool_id:
            q['$match']['metadata.pool_id'] = pool_id

        if provider:
            q['$match']['metadata.provider'] = provider

        if model:
            q['$match']['metadata.model'] = model

        if tag:
            q['$match']['metadata.tags'] = tag

        return (q,)


class BaseUsageStats[IdT](BaseUsageAggregation[IdT]):
    @classmethod
    @lru_cache
    def make_group_id(cls, *groupby: GroupBy | None, **kwargs):
        filtered = filter(None, groupby)
        return dict(chain(*(group_ids[by](**kwargs).items() for by in filtered)))

    @classmethod
    def stage_group(cls, *groupby: str, **kwargs):
        offset = datetime.now(pytz.timezone(ctx.tz.get())).strftime('%z')
        kwargs.setdefault('tz', offset)

        q = {
            '$group': {
                '_id': cls.make_group_id(*groupby, **kwargs) or None,
                **cls.accumulation_fields(),
            }
        }
        return (q,)


class CostUsage(BaseUsageStats, extra='allow'):
    total_cost: Sum

    @classmethod
    async def forecast_usage(
        cls,
        current_usage: float,
        time: TimeRange,
        app_id=None,
        llm_id=None,
    ):
        now = datetime.now(UTC)
        full = time.end - time.begin
        left = time.end - now

        # Is time boundaries in the past? Nothing to forecast
        if left.total_seconds() < 0:
            return current_usage

        try:
            time = TimeRange(begin=now - full, end=now)
        except OverflowError:
            time = TimeRange(begin=time.begin, end=now)

        pipeline = [
            *cls.stage_match(time=time, app_id=app_id, llm_id=llm_id),
            *cls.stage_group(),
        ]
        usage = await anext(aiter(Usage.aggregate(pipeline, cls)), None)

        if usage:
            spending_per_second = usage.total_cost / full.total_seconds()
        else:
            spending_per_second = current_usage / full.total_seconds()

        if current_usage:
            return current_usage + spending_per_second * left.total_seconds()

        return spending_per_second * full.total_seconds()
