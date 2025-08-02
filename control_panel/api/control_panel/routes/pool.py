import logging

from operator import itemgetter

from fastapi import APIRouter
from beanie import PydanticObjectId

from trussed.models.pool import *
from trussed.models.llm import Llm

from control_panel.deps.auth import Auth, GetAuth, AcAPIRouter
from control_panel.utils import deduplicate


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/modelpool', tags=['Model pools'])
router.ac_allow_global_permission_for = {ModelPool}


@router.get('/available-models', dependencies=[GetAuth()])
async def models() -> list[ModelRef]:
    log.info("Entering 'models' endpoint to fetch available models")
    log.debug("Dependencies verified for fetching available models")
    try:
        fetched_models = await fetch_models()
        log.debug(f"Fetched models: {fetched_models}")
        sorted_models = sorted(fetched_models, key=itemgetter('llm_name', 'alias'))
        log.debug(f"Sorted models: {sorted_models}")
        log.info("Successfully fetched and sorted available models")
        return sorted_models
    except Exception as e:
        log.error(f"Error in 'models' endpoint while fetching available models: {e}", exc_info=True)
        raise
    finally:
        log.info("Exiting 'models' endpoint")


@router.post('/create')
async def create(body: ModelPoolCreateDto, auth: Auth = GetAuth()) -> ModelPool:
    log.info("Entering 'create' endpoint to create a new model pool")
    log.debug(f"Request body: {body}")
    log.debug(f"Authenticated user: {auth.user.email} with ownership ID: {auth.user.ownership_id}")
    try:
        pool = ModelPool.model_validate(body, from_attributes=True)
        log.debug(f"Validated ModelPool: {pool}")
        pool.ownership_id = auth.user.ownership_id
        pool.created_by = auth.user.email
        log.debug(f"Setting ownership_id to {pool.ownership_id} and created_by to {pool.created_by}")
        await pool.insert()
        log.info(f"Model pool created with ID: {pool.id}")
        return pool
    except Exception as e:
        log.error(f"Error in 'create' endpoint while creating model pool: {e}", exc_info=True)
        raise
    finally:
        log.info("Exiting 'create' endpoint")


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch() -> list[ModelPool]:
    log.info("Entering 'fetch' endpoint to retrieve all model pools")
    try:
        pools = await ModelPool.find().to_list()
        log.debug(f"Fetched model pools: {pools}")
        log.info(f"Successfully fetched {len(pools)} model pools")
        return pools
    except Exception as e:
        log.error(f"Error in 'fetch' endpoint while fetching model pools: {e}", exc_info=True)
        raise
    finally:
        log.info("Exiting 'fetch' endpoint")


@router.get("/get", dependencies=[GetAuth()])
async def get(id: PydanticObjectId, allmodels: bool = True):
    log.info(f"Entering 'get' endpoint to retrieve model pool with ID: {id} and allmodels={allmodels}")
    log.debug(f"Parameters received - ID: {id}, allmodels: {allmodels}")
    try:
        pool = await ModelPool.find_one(ModelPool.id == id)
        if not pool:
            log.warning(f"Model pool with ID {id} not found")
            return

        log.debug(f"Retrieved model pool: {pool}")

        if allmodels:
            log.info(f"Fetching all models for pool ID: {id}")
            models = await fetch_models()
            log.debug(f"Fetched models for pool: {models}")
            key = itemgetter('llm_id', 'alias')
            pool.models = [*deduplicate(pool.models, models, key)]
            log.debug(f"Deduplicated models for pool {id}: {pool.models}")

        log.info(f"Successfully retrieved model pool with ID: {id}")
        return pool
    except Exception as e:
        log.error(f"Error in 'get' endpoint while retrieving model pool with ID {id}: {e}", exc_info=True)
        raise
    finally:
        log.info("Exiting 'get' endpoint")


@router.post("/update", dependencies=[GetAuth()])
async def update(body: ModelPoolUpdateDto, id: PydanticObjectId):
    log.info(f"Entering 'update' endpoint to update model pool with ID: {id}")
    log.debug(f"Update data: {body}")
    try:
        result = await ModelPool.update_one_from(ModelPool.id == id, body)
        log.debug(f"Update result: {result}")
        await ModelPool.update_relations(id)
        log.info(f"Model pool with ID {id} updated successfully, modified count: {result.modified_count}")
        return result.modified_count
    except Exception as e:
        log.error(f"Error in 'update' endpoint while updating model pool with ID {id}: {e}", exc_info=True)
        raise
    finally:
        log.info("Exiting 'update' endpoint")


@router.post("/delete", dependencies=[GetAuth()])
async def delete(id: PydanticObjectId):
    log.info(f"Entering 'delete' endpoint to delete model pool with ID: {id}")
    try:
        log.debug(f"Attempting to delete model pool with ID: {id}")
        result = await ModelPool.find_one(ModelPool.id == id).delete()
        if result:
            log.debug(f"Delete operation result: {result}")
            await ModelPool.delete_relations(id)
            log.info(f"Model pool with ID {id} deleted successfully, deleted count: {result.deleted_count}")
            return result.deleted_count
        else:
            log.warning(f"Model pool with ID {id} not found for deletion")
            return 0
    except Exception as e:
        log.error(f"Error in 'delete' endpoint while deleting model pool with ID {id}: {e}", exc_info=True)
        raise
    finally:
        log.info("Exiting 'delete' endpoint")


async def fetch_models() -> list[ModelRef]:
    log.info("Entering 'fetch_models' function to retrieve models from LLMs")
    models: list[ModelRef] = []
    try:
        async for llm in Llm.find():
            log.debug(f"Processing LLM: {llm.id} - {llm.name}")
            for model in llm.models:
                model_ref = ModelRef(
                    key=f'{llm.id}/{model["name"]}',
                    llm_id=llm.id,
                    llm_name=llm.name,
                    name=model['name'],
                    alias=model['alias'],
                    enabled=False,
                )
                models.append(model_ref)
                log.debug(f"Added model reference: {model_ref}")
        log.info(f"Total models fetched: {len(models)}")
        return models
    except Exception as e:
        log.error(f"Error in 'fetch_models' while fetching models: {e}", exc_info=True)
        raise
    finally:
        log.info("Exiting 'fetch_models' function")
