# TODO: Refactoring needed

import logging
import pytz

from fastapi import APIRouter, Depends
from beanie import PydanticObjectId
from bson import ObjectId
from pydantic import BaseModel, ConfigDict

from control_panel.deps.auth import Auth, GetAuth

from trussed.models import float3
from trussed.models.apikey import Apikey
from trussed.models.llm import Llm
from trussed.models.alert import *
from trussed.models.usage import *


log = logging.getLogger(__name__)
router = APIRouter(prefix="/stats")


strftime: dict[AlertPeriod, str] = {
    'Minutely': '%H:%M',
    'Daily': '%b %d',
    'Weekly': '%b %d',
    'Monthly': '%b',
}


@router.get("/alert", dependencies=[GetAuth()])
async def fetch_alert_stats(id: PydanticObjectId, count=25):
    q = AlertLog.find(AlertLog.log_type == 'Recycled', AlertLog.alert_id == id)
    alertlogs = await q.to_list(count) or []
    bars = []

    for alert in alertlogs:
        localtime = alert.starts_at.astimezone(pytz.timezone(alert.timezone))

        bars.append(
            dict(
                period=localtime.strftime(strftime[alert.period]),
                actual=round(alert.used, 3),
                budget=round(alert.budget or 0, 3),
            )
        )

    return bars


metadata_ids = {
    'llm': '$metadata.llm_id',
    'app': '$metadata.key_id',
}

Span = Literal['minute', 'day', 'week', 'month']

strftime4span: dict[Span, str] = {
    'minute': '%Y-%m-%d %H:%M',
    'day': '%Y-%m-%d',
    'week': '%Y-%m %V',
    'month': '%Y-%m',
}


class AggregationGroup(BaseModel, extra='allow'):
    id: PydanticObjectId | Any | None = Field(alias='_id', default=None)
    total_cost: float3
    total_tokens: float3
    response_time: float3 | None = None
    ids: list[PydanticObjectId] | None = None


class TimeRange(BaseModel):
    begin: datetime = datetime.min
    end: datetime = datetime.max


@router.get('/time/{by}', dependencies=[GetAuth()])
async def fetch(by: Literal['llm', 'app'], span: Span, time: TimeRange = Depends()):
    dateformat = strftime4span[span]

    q = Usage.find(Usage.timestamp > time.begin, Usage.timestamp < time.end)
    q = q.aggregate(
        [
            {
                '$group': {
                    '_id': [
                        {'$dateToString': {'format': dateformat, 'date': '$timestamp'}},
                        metadata_ids[by],
                    ],
                    'avg_response_time': {'$avg': '$response_time'},
                    'total_cost': {'$sum': '$total_cost'},
                    'total_tokens': {'$sum': '$total_tokens'},
                }
            },
            {'$sort': {'_id': 1}},
        ]
    )

    bydate = {}
    ids = set()

    for i in await q.to_list():
        i.update((k, round(v, 3)) for k, v in i.items() if isinstance(v, float))

        date, id = i.pop('_id')
        bydate.setdefault(date, []).append({'_id': id, **i})
        ids.add(id)

    match by:
        case 'app':
            names = {
                i.id: i.name for i in await Apikey.find({'_id': {'$in': ids}}).to_list()
            }
        case 'llm':
            names = {
                i.id: i.name for i in await Llm.find({'_id': {'$in': ids}}).to_list()
            }

    data = []

    for date, stats in bydate.items():
        print(date, stats)
        data.append(
            dict(
                name=date,
                stacks={
                    names.get(i['_id'], f'Deleted @{i["_id"]}'): i['total_cost']
                    for i in stats
                },
            )
        )

    keys = []

    for i in data:
        keys.extend(i['stacks'].keys())

    return dict(data=data, keys=set(keys))


StatsBy = Literal['app', 'llm', 'app-model', 'llm-model']


@router.get("/{by}", dependencies=[GetAuth()])
async def fetch_global(
    by: StatsBy, id: PydanticObjectId = None, time: TimeRange = Depends()
):
    q = {
        '$match': {
            'metadata.provider': 'OpenAI',
            'timestamp': {'$gt': time.begin, '$lt': time.end},
        }
    }

    match by:
        case 'app':
            group_id = '$metadata.key_id'

        case 'llm':
            group_id = '$metadata.llm_id'

        case 'app-model':
            group_id = '$metadata.model'
            q['$match']['metadata.key_id'] = id

        case 'llm-model':
            group_id = '$metadata.model'
            q['$match']['metadata.llm_id'] = id

    q = Usage.aggregate(
        [
            q,
            {
                '$group': {
                    '_id': group_id,
                    'response_time': {'$avg': '$response_time'},
                    'total_cost': {'$sum': '$total_cost'},
                    'total_tokens': {'$sum': '$total_tokens'},
                }
            },
        ],
        projection_model=AggregationGroup,
    )

    aggregated = {i.id: i for i in await q.to_list()}

    def setname(objects, names=None, default=None):
        for i in objects:
            if names is not None:
                i.name = names.get(i.id, default or f'Deleted @{i.id}')
            else:
                i.name = i.id

            yield i

    match by:
        case 'app':
            objects = await Apikey.find({'_id': {'$in': aggregated.keys()}}).to_list()

        case 'llm':
            objects = await Llm.find({'_id': {'$in': aggregated.keys()}}).to_list()

        case _:
            return [*setname(aggregated.values())]

    names = {i.id: i.name for i in objects}

    return [*setname(aggregated.values(), names)]
