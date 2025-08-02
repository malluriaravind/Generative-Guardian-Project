from typing import *

from pydantic import BaseModel
from dataclasses import dataclass
from beanie import PydanticObjectId


class ModelObject(TypedDict):
    name: str
    alias: str
    price_input: float
    price_output: float
    enabled: bool | None


class ModelRef(TypedDict):
    key: str
    llm_id: PydanticObjectId
    llm_name: str
    name: str
    alias: str
    enabled: bool | None


class BaseLlm(BaseModel):
    id: PydanticObjectId
    name: str
    models: list[ModelObject]


@dataclass(slots=True, init=False)
class UpdateModelRefs:
    pull: dict
    update: dict
    array_filters: list[dict]

    def __init__(self, field: str, llm: BaseLlm):
        pull = {
            '$pull': {
                field: {
                    'llm_id': llm.id,
                    'name': {'$nin': [i['name'] for i in llm.models]},
                }
            },
        }

        update = {'$set': {}}
        array_filters = []

        for n, model in enumerate(llm.models):
            update['$set'][f'{field}.$[i{n}].llm_name'] = llm.name
            update['$set'][f'{field}.$[i{n}].alias'] = model['alias']
            array_filters.append({f'i{n}.llm_id': llm.id, f'i{n}.name': model['name']})

        self.pull = pull
        self.update = update
        self.array_filters = array_filters
