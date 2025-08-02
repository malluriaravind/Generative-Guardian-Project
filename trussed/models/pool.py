from typing import *
from operator import itemgetter
from bson import ObjectId
from beanie import PydanticObjectId
from pydantic import BaseModel, Field, EmailStr, model_validator

from ..pydantic import FilterItem

from . import AppDocument, Unscoped, BaseCreateModel, BaseUpdateModel
from .systag import SysTag
from .apikey import Apikey
from .llmbase import BaseLlm, ModelRef, UpdateModelRefs


class ModelPool(AppDocument):
    scoped_context_enable: ClassVar[bool] = True

    ownership_id: PydanticObjectId | None = None
    created_by: str | None = None

    tags: list[str] = Field(default_factory=list)
    system_tags: list[SysTag] = Field(default_factory=list)
    fanout: bool = False

    name: str
    virtual_model_name: str
    models: list[ModelRef]

    @classmethod
    async def purge_llm(cls, llm_id: ObjectId):
        find = {'models.llm_id': llm_id}
        pull = {'models': {'llm_id': llm_id}}
        return await cls.find(find).update({'$pull': pull})

    @classmethod
    @Unscoped()
    async def update_llm(cls, llm: BaseLlm):
        update = UpdateModelRefs('models', llm)
        query = cls.find({'models.llm_id': llm.id})
        await query.update(update.pull)
        await query.update(update.update, array_filters=update.array_filters)

    @classmethod
    @Unscoped()
    async def delete_relations(cls, id: ObjectId):
        return await Apikey.purge_pool(id)

    @classmethod
    @Unscoped()
    async def update_relations(cls, id: ObjectId):
        await Apikey.set_updated_at(Apikey.pool_access == id)


class ModelPoolCreateDto(BaseCreateModel):
    name: str
    tags: list[str] = Field(default_factory=list)
    fanout: bool = False
    virtual_model_name: str
    models: Annotated[list[ModelRef], FilterItem('enabled')]


class ModelPoolUpdateDto(BaseUpdateModel):
    name: str | None = None
    tags: list[str] | None = None
    fanout: bool | None = None
    virtual_model_name: str | None = None
    models: Annotated[list[ModelRef], FilterItem('enabled')] | None = None
