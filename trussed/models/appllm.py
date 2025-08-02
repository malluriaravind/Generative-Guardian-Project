from typing import *
from beanie import PydanticObjectId

from .apikey import Apikey
from .llm import Llm
from . import Unscoped


AppLlmType = Literal['APP', 'LLM']


class AppLlm(TypedDict):
    name: str
    object_type: AppLlmType
    object_id: PydanticObjectId
    enabled: bool | None


class NamedDocument(Protocol):
    id: PydanticObjectId
    name: str


@Unscoped()
async def update_relations(object: NamedDocument):
    from .alert import Alert
    from .budget import Budget

    query = {'watch.object_id': object.id}
    update = {'$set': {'watch.$[i].name': object.name}}
    array_filters = [{'i.object_id': object.id}]

    await Alert.find_many(query).update_many(update, array_filters=array_filters)
    await Budget.find_many(query).update_many(update, array_filters=array_filters)


async def update_appllm(appllm: AppLlm, update: dict[str, str]):
    if appllm['object_type'] == 'APP':
        await Apikey.find_one(Apikey.id == appllm['object_id']).update(update)

    if appllm['object_type'] == 'LLM':
        await Llm.find_one(Llm.id == appllm['object_id']).update(update)
        await Llm.touch_related(appllm['object_id'])


async def fetch_appllm() -> list[AppLlm]:
    apps = [
        AppLlm(
            name=i.name,
            object_type='APP',
            object_id=i.id,
            enabled=False,
        )
        async for i in Apikey.find_many()
    ]

    llms = [
        AppLlm(
            name=i.name,
            object_type='LLM',
            object_id=i.id,
            enabled=False,
        )
        async for i in Llm.find_many()
    ]

    return apps + llms
