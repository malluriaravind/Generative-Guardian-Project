import logging

from fastapi import APIRouter
from beanie import UpdateResponse
from pymongo.errors import DuplicateKeyError
from types import *

from control_panel.deps.auth import Auth, GetAuth, AcAPIRouter

from trussed.models.apikey import *
from trussed.models import appllm


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/apikey', tags=['Application keys'])
router.ac_allow_global_permission_for = {Apikey}


@router.get('/rate-periods')
async def providers() -> list[RatePeriod]:
    log.debug("Fetching rate periods")
    return get_args(RatePeriod)


@router.post('/create')
async def create(body: ApikeyCreateDto, auth: Auth = GetAuth()) -> ApikeyKeyDto:
    log.info(f"Creating API key for user: {auth.user.email}")
    apikey = Apikey.model_validate(body, from_attributes=True)
    apikey.created_by = auth.user.email

    log.debug(f"API Key details: {apikey}")

    try:
        await apikey.insert()
        log.info(f"API Key created successfully: {apikey.id}")
    except DuplicateKeyError as e:
        log.warning(f"Duplicate API Key creation attempt: {body.key}")
        raise Apikey.error_from_mongo(e) from None

    return ApikeyKeyDto(key=body.key)


@router.post('/update', dependencies=[GetAuth()])
async def update(body: ApikeyUpdateDto, id: PydanticObjectId):
    log.info(f"Updating API key: {id}")
    try:
        apikey = await Apikey.update_one_from(
            Apikey.id == id,
            body,
            response_type=UpdateResponse.NEW_DOCUMENT,
        )
        log.debug(f"Updated API Key: {apikey}")
    except DuplicateKeyError as e:
        log.warning(f"Duplicate API Key update attempt for ID: {id}")
        raise Apikey.error_from_mongo(e) from None

    if apikey:
        await appllm.update_relations(apikey)
        log.info(f"API Key updated successfully: {id}")
        return 1

    log.warning(f"API Key not found for update: {id}")
    return 0


@router.post('/delete', dependencies=[GetAuth()])
async def delete(id: PydanticObjectId):
    log.info(f"Deleting API Key: {id}")
    result = await Apikey.find_one(Apikey.id == id).delete()
    if result.deleted_count:
        log.info(f"API Key deleted successfully: {id}")
    else:
        log.warning(f"API Key not found for deletion: {id}")
    return result.deleted_count


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch() -> List[Apikey]:
    log.info("Fetching all API keys")
    objects = await Apikey.find_many().to_list()
    log.debug(f"Fetched {len(objects)} API keys")
    return objects
