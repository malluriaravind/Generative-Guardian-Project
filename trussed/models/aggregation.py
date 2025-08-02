from typing import Annotated, TypeGuard, TypedDict, Self, Any
from pydantic import BaseModel, Field
from beanie import Document

from trussed.pydantic import NullTo
from trussed.utils.cache import lru_cache


Sum = Annotated[float, '$sum', NullTo(0)]
Avg = Annotated[float, '$avg', NullTo(0)]
Max = Annotated[float, '$max', NullTo(0)]
Min = Annotated[float, '$min', NullTo(0)]
Count = Annotated[int, {'$count': {}}, NullTo(0)]
AddToSet = Annotated[list, '$addToSet', NullTo(list)]
Push = Annotated[list, '$push', NullTo(list)]

LookupDict = TypedDict('LookupDict', {
    'from': str,
    'localField': str,
    'foreignField': str,
    'as': str,
    'pipeline': list[dict[str, Any]],
    },
    total=False
)

LookupStageDict = TypedDict('LookupStageDict', {
    '$lookup': LookupDict
})


def isoperator(i) -> TypeGuard[str]:
    return isinstance(i, str) and i.startswith('$')


def isdict(i) -> TypeGuard[dict]:
    return isinstance(i, dict)


class BaseAggregation[IdT](BaseModel):
    id: IdT | None = Field(alias='_id', default=None)
    _aggregated_list: list[Self] | None = None

    @classmethod
    @lru_cache
    def accumulation_fields(cls) -> dict[str, Any]:
        query = {}

        for fieldname, info in cls.model_fields.items():
            fieldname = info.alias or fieldname
            operators = filter(isoperator, info.metadata)
            dicts = filter(isdict, info.metadata)

            if expression := next(dicts, None):
                query[fieldname] = expression

            if operator := next(operators, None):
                query[fieldname] = {
                    operator: expression or next(operators, None) or '$' + fieldname
                }

        return query

    @classmethod
    async def aggregate(cls, pipeline: list, doctype: type[Document], **kwargs):
        query = doctype.aggregate(pipeline, cls, **kwargs)

        if aggregated := [i async for i in query]:
            aggregated[0]._aggregated_list = aggregated
            return aggregated[0]

    def get_aggregated_list(self) -> list[Self]:
        return self._aggregated_list or []

    @classmethod
    def make_group_id(cls, *args, **kwargs):
        return None

    @classmethod
    def stage_group(cls, *args, **kwargs):
        q = {
            '$group': {
                '_id': cls.make_group_id(*args, **kwargs) or None,
                **cls.accumulation_fields(),
            }
        }
        return (q,)

    @classmethod
    @lru_cache
    def stage_round(cls, places=3):
        rounded = {'$sum', '$avg'}
        fields = {}

        for field, value in cls.accumulation_fields().items():
            if isinstance(value, dict) and value.keys() & rounded:
                fields[field] = {'$round': [f'${field}', places]}
            else:
                fields[field] = 1

        return ({'$project': fields},)

    @classmethod
    def stage_flatten_set(cls, field: str, input_field: str | None = None):
        return (
            {
                '$addFields': {
                    field: {
                        '$reduce': {
                            'input': input_field or f'${field}',
                            'initialValue': [],
                            'in': {'$setUnion': ['$$value', '$$this']},
                        },
                    },
                },
            },
        )

    @classmethod
    def stage_unwind(cls, target: str, *, preserve=True):
        q = {'$unwind': {'path': f'${target}', 'preserveNullAndEmptyArrays': preserve}}
        return (q,)

    @classmethod
    def stage_merge_objects(cls, field: str):
        q = {
            '$replaceWith': {
                '$cond': [
                    {'$eq': [{'$type': field}, 'object']},
                    {'$mergeObjects': ['$$ROOT', field]},
                    '$$ROOT',
                ]
            },
        }

        return (q,)

    @classmethod
    @lru_cache
    def stage_sort(cls, *sortby: str):
        fields = {k.strip('+-'): (1, -1)[k.startswith('-')] for k in sortby}
        return ({'$sort': fields},) if fields else ()

    @classmethod
    @lru_cache(1000)
    def stage_join(
        cls,
        collection: str,
        fields: tuple[str, ...],
        local = '_id._id',
        foreign = '_id',
        to = '',
        id=None,
        filter_empty=False,
    ) -> tuple[dict, ...]:
        lookup: LookupStageDict = {
            '$lookup': {
                'from': collection,
                'localField': local,
                'foreignField': foreign,
                'as': '_joined',
            }
        }

        if id:
            lookup['$lookup'].pop('localField')
            lookup['$lookup'].pop('foreignField')
            lookup['$lookup'].setdefault('pipeline', []).insert(0, {'$match': {'_id': id}})
        
        if to:
            prefix = to + '.'
        else:
            prefix = ''

        match_nonempty = {'$match': {'_joined': {'$ne': []}}}
        join = (
            {'$unwind': {'path': '$_joined', 'preserveNullAndEmptyArrays': True}},
            {'$set': {prefix + i: f'$_joined.{i}' for i in fields}},
            {'$unset': '_joined'}
        )

        if filter_empty:
            return (lookup, match_nonempty, *join)

        return (lookup, *join)
