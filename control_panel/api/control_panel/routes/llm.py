import logging
import asyncio

from fastapi import APIRouter
from pydantic import BaseModel
from typing import *

from beanie import PydanticObjectId, UpdateResponse
from pymongo.errors import DuplicateKeyError

from control_panel.utils import deduplicate_dicts
from control_panel.deps.auth import Auth, GetAuth, AcAPIRouter

from trussed.pydantic import model_update_if_none
from trussed.llmtools.common import load_provider, test_llm

from trussed.models import appllm
from trussed.models.pool import ModelPool
from trussed.models.llm import *
from trussed.errors import *


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/llm', tags=['LLM providers'])
router.ac_allow_global_permission_for = {Llm}


class DescriptiveProvider(BaseModel):
    name: str
    value: LlmProvider


descriptive_providers_list = [
    DescriptiveProvider(
        name='OpenAI',
        value='OpenAI',
    ),
    DescriptiveProvider(
        name='Microsoft Azure',
        value='Azure',
    ),
    DescriptiveProvider(
        name='Amazon Bedrock',
        value='Bedrock',
    ),
    DescriptiveProvider(
        name='Google Gemini',
        value='Gemini',
    ),
    DescriptiveProvider(
        name='Mistral',
        value='Mistral',
    ),
    DescriptiveProvider(
        name='Anthropic',
        value='Anthropic',
    ),
    DescriptiveProvider(
        name='Other OpenAI-compatible provider',
        value='OpenAICompatible',
    ),
    DescriptiveProvider(
        name='Azure ML inferencing server: Score / Chat Completion',
        value='AzureMLChatScore',
    ),
    DescriptiveProvider(
        name='Azure ML inferencing server: Score / Prompt',
        value='AzureMLPromptScore',
    ),
    DescriptiveProvider(
        name='Azure ML inferencing server: Score / Embedding',
        value='AzureMLEmbeddingScore',
    ),
]

descriptive_tokenizers_list = [
    TrfTokenizer(
        name='Local: llama-7b',
        path='./tokenizers/llama-7b',
        has_chat_template=True,
    ),
    TrfTokenizer(
        name='Local: deepseek-coder-6.7b-base',
        path='./tokenizers/deepseek-coder-6.7b-base',
        has_chat_template=False,
    ),
    TrfTokenizer(
        name='Local: nomic-embed-text-v1.5',
        path='./tokenizers/nomic-embed-text-v1.5',
        has_chat_template=False,
    ),
]


class AllOptions(BaseModel):
    provider: LlmProvider
    api_key: str | None = None
    endpoint: str | None = None
    deployment: str | None = None
    version: str | None = None
    access_key_id: str | None = None
    access_key: str | None = None
    region: str | None = None
    completion_endpoint: str | None = None
    embedding_endpoint: str | None = None
    authorization_header: str | None = None
    authorization_value: str | None = None
    headers: list[CutomLlmHeader] | None = None
    tokenizer: TrfTokenizer | None = None

    def for_update(self):
        cls = options_for_update[self.provider]
        return cls.model_validate(self, from_attributes=True)

    def for_create(self):
        cls = options_for_create[self.provider]
        return cls.model_validate(self, from_attributes=True)


@router.post('/pricelist', dependencies=[GetAuth()])
async def pricelist(raw_options: AllOptions, id: PydanticObjectId | None = None):
    log.info("Received request to '/pricelist' with raw_options=%s and id=%s", raw_options, id)
    try:
        if id:
            log.debug("Updating existing LLM with id=%s", id)
            options = raw_options.for_update()

            if not (llm := await Llm.find_one(Llm.id == id)):
                log.warning("LLM with id=%s not found", id)
                raise NotFoundError()

            if llm_options := llm.get_options():
                model_update_if_none(options, llm_options)
        else:
            log.debug("Creating new LLM")
            options = raw_options.for_create()

        provider = raw_options.provider
        log.info("Loading provider '%s' with options: %s", provider, options)
        result = await load_provider(raw_options.provider, options)
        log.info("Provider '%s' loaded successfully", provider)
        return result
    except Exception as e:
        log.error("Error in '/pricelist': %s", e, exc_info=True)
        raise


@router.post('/test', dependencies=[GetAuth()])
async def test(id: PydanticObjectId):
    log.info("Received request to '/test' with id=%s", id)
    try:
        if not (llm := await Llm.find_one(Llm.id == id)):
            log.warning("LLM with id=%s not found", id)
            raise NotFoundError()

        log.debug("Testing LLM with id=%s", id)
        await test_llm(llm, assign_status=llm.status != 'Disabled')
        log.info("LLM with id=%s tested successfully", id)
    except Exception as e:
        log.error("Error in '/test' for id=%s: %s", id, e, exc_info=True)
        raise
    finally:
        await llm.replace()
        log.debug("Replaced LLM document for id=%s", id)


@router.get('/providers')
async def providers() -> list[LlmProvider]:
    log.info("Received request to '/providers'")
    try:
        providers_list = get_args(LlmProvider)
        log.debug("Available providers: %s", providers_list)
        return providers_list
    except Exception as e:
        log.error("Error in '/providers': %s", e, exc_info=True)
        raise


@router.get('/descriptive-providers')
async def descriptive_providers() -> list[DescriptiveProvider]:
    log.info("Received request to '/descriptive-providers'")
    try:
        log.debug("Returning descriptive providers list")
        return descriptive_providers_list
    except Exception as e:
        log.error("Error in '/descriptive-providers': %s", e, exc_info=True)
        raise


@router.get('/descriptive-tokenizers')
async def descriptive_tokenizers(provider: LlmProvider | None = None) -> list[TrfTokenizer]:
    match provider:
        case 'AzureMLChatScore':
            return [i for i in descriptive_tokenizers_list if i.has_chat_template]

        case _:
            return descriptive_tokenizers_list


@router.post('/create')
async def create(body: LlmCreateDto, auth: Auth = GetAuth()) -> LlmOutDto:
    log.info("Received request to '/create' with body=%s by user=%s", body, auth.user.email)
    try:
        llm = Llm.model_validate(body, from_attributes=True)
        llm.ownership_id = auth.user.ownership_id
        llm.created_by = auth.user.email

        log.debug("Inserting new LLM: %s", llm)
        await llm.insert()
        log.info("LLM created with id=%s", llm.id)
        return llm
    except DuplicateKeyError as e:
        log.warning("Duplicate key error while creating LLM: %s", e)
        raise Llm.error_from_mongo(e) from None
    except Exception as e:
        log.error("Error in '/create': %s", e, exc_info=True)
        raise


@router.post('/update', dependencies=[GetAuth()])
async def update(body: LlmUpdateDto, id: PydanticObjectId):
    log.info("Received request to '/update' for id=%s with body=%s", id, body)
    try:
        log.debug("Updating LLM with id=%s", id)
        llm: Llm = await Llm.update_one_from(
            Llm.id == id,
            body,
            response_type=UpdateResponse.NEW_DOCUMENT,
        )
    except DuplicateKeyError as e:
        log.warning("Duplicate key error while updating LLM id=%s: %s", id, e)
        raise Llm.error_from_mongo(e) from None
    except Exception as e:
        log.error("Error in '/update' for id=%s: %s", id, e, exc_info=True)
        raise

    if llm:
        try:
            log.debug("Updating relations for LLM id=%s", id)
            await appllm.update_relations(llm)
            await llm.update_relations()
            log.info("LLM id=%s updated successfully", id)
            return 1
        except Exception as e:
            log.error("Error updating relations for LLM id=%s: %s", id, e, exc_info=True)
            raise
    else:
        log.warning("LLM with id=%s not found for update", id)
        return 0


@router.post('/delete', dependencies=[GetAuth()])
async def delete(id: PydanticObjectId):
    log.info("Received request to '/delete' for id=%s", id)
    try:
        log.debug("Deleting LLM with id=%s", id)
        result = await Llm.find_one(Llm.id == id).delete()
        await Llm.delete_relations(id)
        log.info("LLM with id=%s deleted successfully, count=%s", id, result.deleted_count)
        return result.deleted_count
    except Exception as e:
        log.error("Error in '/delete' for id=%s: %s", id, e, exc_info=True)
        raise


@router.post('/disable', dependencies=[GetAuth()])
async def disable(id: PydanticObjectId):
    log.info("Received request to '/disable' for id=%s", id)
    try:
        log.debug("Disabling LLM with id=%s", id)
        result = await Llm.find_one(Llm.id == id).update(
            {
                '$set': {Llm.status: 'Disabled'},
            }
        )
        await Llm.touch_related(id)
        log.info("LLM with id=%s disabled successfully, modified_count=%s", id, result.modified_count)
        return result.modified_count
    except Exception as e:
        log.error("Error in '/disable' for id=%s: %s", id, e, exc_info=True)
        raise


@router.post('/enable', dependencies=[GetAuth()])
async def enable(id: PydanticObjectId):
    log.info("Received request to '/enable' for id=%s", id)
    try:
        log.debug("Enabling LLM with id=%s", id)
        result = await Llm.find_one(Llm.id == id).update(
            {
                '$set': {Llm.status: 'Pending'},
            }
        )
        await Llm.touch_related(id)

        asyncio.create_task(test(id))
        log.info("LLM with id=%s enabled and test initiated, modified_count=%s", id, result.modified_count)
        return result.modified_count
    except Exception as e:
        log.error("Error in '/enable' for id=%s: %s", id, e, exc_info=True)
        raise


@router.get('/get', dependencies=[GetAuth()])
async def get(id: PydanticObjectId, allmodels=True):
    log.info("Received request to '/get' for id=%s with allmodels=%s", id, allmodels)
    try:
        llm = await Llm.find_one(Llm.id == id, projection_model=LlmOutDto)

        if not llm:
            log.warning("LLM with id=%s not found", id)
            return

        if allmodels:
            try:
                log.debug("Loading models for LLM id=%s", id)
                models = await load_provider(llm.provider, llm.get_options())
            except Exception as e:
                log.error("Error loading provider for LLM id=%s: %s", id, e, exc_info=True)
                models = []

            log.debug("Deduplicating models for LLM id=%s", id)
            llm.models = deduplicate_dicts(llm.models, models, 'name')

        log.info("Returning LLM data for id=%s", id)
        return llm
    except Exception as e:
        log.error("Error in '/get' for id=%s: %s", id, e, exc_info=True)
        raise


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch() -> List[LlmOutDto]:
    log.info("Received request to '/fetch'")
    try:
        log.debug("Fetching all LLMs")
        objects = await LlmOutDto.find_many().to_list()
        log.info("Fetched %d LLMs", len(objects))
        return objects
    except Exception as e:
        log.error("Error in '/fetch': %s", e, exc_info=True)
        raise
