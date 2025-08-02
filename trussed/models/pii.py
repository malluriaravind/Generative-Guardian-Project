from typing import *

from functools import cached_property
from bson import ObjectId
from beanie.odm.queries.find import FindMany
from pydantic import BaseModel, computed_field
from pymongo import IndexModel
from datetime import datetime

from ..errors import PiiEntityAlreadyExistError
from ..pydantic import RegexStr, UpperCaseSlug

from .piibase import *
from .policies import Policy
from .apikey import Apikey
from . import AppDocument, Unscoped


class CustomPii(AppDocument, BasePii):
    """
    Custom regex-based PII entity recognizer
    """

    pattern: str
    context_words: list[str] | None = None
    prerecognition_entity: str | None = None
    """A model entity to narrow search to spans pre-recognized by the selected entity."""

    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Settings:
        indexes = [
            IndexModel(['entity']),
            IndexModel(['created_at']),
        ]

    @Unscoped()
    async def update_relations(self):
        find = {'pii.entities.entity_id': self.id}
        update = {
            '$set': {
                'pii.entities.$[i].entity': self.entity,
                'updated_at': datetime.utcnow(),
            }
        }
        array_filter = {'i.entity_id': self.id}

        await update_related_apps(Policy.find(find))
        await Policy.find(find).update(update, array_filters=[array_filter])

    @classmethod
    @Unscoped()
    async def delete_relations(cls, pii_id: ObjectId):
        find = {'pii.entities.entity_id': pii_id}
        update = {
            '$pull': {
                'pii.entities': {
                    'entity_id': pii_id,
                }
            },
            '$set': {
                'updated_at': datetime.utcnow(),
            },
        }

        await update_related_apps(Policy.find(find))
        await Policy.find(find).update(update)

    @staticmethod
    def error_from_mongo(e):
        if value := e.details['keyValue'].get('entity'):
            message = f"The entity '{value}' is already in use"
            return PiiEntityAlreadyExistError(message)

        return e


async def update_related_apps(q: FindMany[Policy]):
    pipeline = [
        {
            '$group': {
                '_id': None,
                'policies': {'$push': '$_id'},
            }
        },
    ]
    update = {
        '$set': {'updated_at': datetime.utcnow()},
    }

    if aggregated := await q.aggregate(pipeline).to_list():
        policies = aggregated[0]['policies']
        await Apikey.find({'policies': {'$in': policies}}).update(update)


class CreatePiiRecognizer(BaseModel):
    entity: Annotated[str, UpperCaseSlug()]
    description: str
    pattern: RegexStr
    context_words: list[str] | None = None
    prerecognition_entity: ModelEntityName | None = None

    @computed_field
    @cached_property
    def created_at(self) -> datetime:
        return datetime.utcnow()


class UpdatePiiRecognizer(BaseModel):
    entity: Annotated[str, UpperCaseSlug()] | None = None
    description: str | None = None
    pattern: RegexStr | None = None
    context_words: list[str] | None = None
    prerecognition_entity: ModelEntityName | None = None
