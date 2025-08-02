import logging

from typing import *
from beanie import PydanticObjectId, UpdateResponse
from pymongo.errors import WriteError
from fastapi import APIRouter

from trussed.spacy.models import SpacyModelMetadata
from trussed.spacy.repr import representative_metadata, get_spacy_models

from trussed.models.policies import PiiAction
from trussed.models.pii import *

from ..deps.auth import GetAuth


log = logging.getLogger(__name__)

router = APIRouter(prefix='/pii', tags=['PII'])


class DescritpiveAction(BaseModel):
    name: str
    value: PiiAction


descriptive_actions = [
    DescritpiveAction(
        name='Redaction (replace the PII with a given character)',
        value='Redaction',
    ),
    DescritpiveAction(
        name='Anonymization (replace the PII with a representative non-identifiable data)',
        value='Anonymization',
    ),
    DescritpiveAction(
        name='Tokenization (replace the PII with a random token, untokenize on the return path)',
        value='Tokenization',
    ),
]


@router.get('/descriptive-actions', dependencies=[GetAuth()])
async def actions() -> list[DescritpiveAction]:
    return descriptive_actions


@router.get('/models', dependencies=[GetAuth()])
async def models() -> list[SpacyModelMetadata]:
    def f(i: SpacyModelMetadata):
        return i['model'].endswith('_md') or i['model'] == 'xx_ent_wiki_sm'

    return [*map(representative_metadata, filter(f, get_spacy_models()))]


@router.get('/entities', dependencies=[GetAuth()])
async def entities() -> list[BasePii]:
    entities = await CustomPii.find(projection_model=BasePii).to_list()
    return entities + [*predefined_pii_entities.values()]


@router.get('/entities/model', dependencies=[GetAuth()])
async def model_entities() -> list[BasePii]:
    entities = predefined_pii_entities.values()
    return [*filter(lambda x: x.origin == 'model', entities)]


@router.get('/entities/custom/fetch', dependencies=[GetAuth()])
async def custom_entities() -> list[CustomPii]:
    find = CustomPii.find().sort(-CustomPii.created_at)
    return await find.to_list()


@router.post('/entities/custom/create', dependencies=[GetAuth()])
async def create(body: CreatePiiRecognizer) -> CustomPii:
    pii = CustomPii.model_validate(body, from_attributes=True)

    try:
        await pii.insert()
    except WriteError as e:
        raise CustomPii.error_from_mongo(e) from None

    return pii


@router.post('/entities/custom/update', dependencies=[GetAuth()])
async def update(body: UpdatePiiRecognizer, id: PydanticObjectId) -> int:
    try:
        pii = await CustomPii.update_one_from(
            CustomPii.id == id,
            body,
            response_type=UpdateResponse.NEW_DOCUMENT,
        )
    except WriteError as e:
        raise CustomPii.error_from_mongo(e) from None

    if pii:
        await pii.update_relations()
        return 1

    return 0


@router.post('/entities/custom/delete', dependencies=[GetAuth()])
async def delete(id: PydanticObjectId) -> int:
    r = await CustomPii.find(CustomPii.id == id).delete()

    if r.deleted_count:
        await CustomPii.delete_relations(id)

    return r.deleted_count
