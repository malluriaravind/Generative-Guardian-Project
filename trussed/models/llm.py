from typing import *
from hashlib import sha1
from operator import itemgetter
from dataclasses import dataclass
from bson import ObjectId

from pydantic import (
    BaseModel,
    Field,
    computed_field,
    model_validator,
)
from pydantic_extra_types.color import Color

from beanie import PydanticObjectId, UpdateResponse
from pymongo import IndexModel
from datetime import datetime

from ..utils import flatten_onelevel
from ..utils.cache import lru_cache
from ..utils.color import object_id_color
from ..pydantic import MaskedStr, NonMaskedStr, mask, custom_validation_error
from .. import errors

from .llmbase import *
from .systag import SysTag
from .apikey import Apikey
from .pool import ModelPool
from . import AppDocument, BaseCreateModel, BaseUpdateModel, Unscoped


LlmProvider = Literal[
    'OpenAI',
    'Azure',
    'Bedrock',
    'Gemini',
    'Mistral',
    'Anthropic',
    'OpenAICompatible',
    'AzureMLChatScore',
    'AzureMLPromptScore',
    'AzureMLEmbeddingScore',
]
LlmStatus = Literal[
    'Connected',
    'Pending',
    'Error',
    'Disabled',
]
LlmFeature = Literal[
    'messages',
    'stream',
    'n',
    'tools',
]
ModelObjects = list['Llm.ModelObject']


class BaseProviderOptions(BaseModel):
    timeout: float = 10
    max_connections: int = 50
    'Maximum number of concurrent connections'

    max_keepalive_connections: int = 10
    'Maximum number of idle connections maintained in the pool'

    def key_suffix(self) -> str:
        return ''


#
# Open AI
class OpenAiOptions(BaseProviderOptions):
    api_key: str

    def key_suffix(self):
        return self.api_key[-5:]


class MaskedOpenAiOptions(OpenAiOptions):
    api_key: MaskedStr


class UpdateOpenAiOptions(OpenAiOptions):
    api_key: NonMaskedStr


#
# Base custom LLM provider
class CutomLlmHeader(BaseModel):
    name: str
    value: str


class TrfTokenizer(BaseModel):
    name: str
    path: str
    has_chat_template: bool | None = None
    revision: str | None = None


class CustomLlmOptions(BaseProviderOptions):
    completion_endpoint: str | None = None
    embedding_endpoint: str | None = None
    authorization_header: str | None = None
    authorization_value: str | None = None
    headers: list[CutomLlmHeader] | None = None

    def key_suffix(self):
        return (self.authorization_value or '')[-5:]

    def ensure_bearer(self) -> str | None:
        if not (self.authorization_header and self.authorization_value):
            return None

        token = self.authorization_value

        # Normalize Authorization Bearer header
        if token and self.authorization_header.lower() == 'authorization':
            if ' ' in self.authorization_value:
                token = self.authorization_value.split(' ', 1)[1]
            else:
                self.authorization_value = f'Bearer {self.authorization_value}'

        return token

    def make_headers(self, with_authorization=False) -> dict[str, str]:
        headers = {i.name: i.value for i in self.headers or ()}

        if with_authorization:
            if self.authorization_header and self.authorization_value:
                headers[self.authorization_header] = self.authorization_value

        return headers


#
# Azure ML inferencing server: Score for Chat
# Azure ML inferencing server: Score for Prompt
# Azure ML inferencing server: Score for Embedding
class CustomProviderOptions(CustomLlmOptions):
    tokenizer: TrfTokenizer | None = None
    openai_input: bool | None = None


class MaskedCustomProviderOptions(CustomProviderOptions):
    authorization_value: MaskedStr | None = None


class UpdateCustomProviderOptions(CustomProviderOptions):
    authorization_value: NonMaskedStr | None = None


#
# Open AI Compatible
class OpenAICompatibleOptions(CustomLlmOptions):
    pass


class MaskedOpenAICompatibleOptions(OpenAICompatibleOptions):
    authorization_value: MaskedStr | None = None


class UpdateOpenAICompatibleOptions(OpenAICompatibleOptions):
    authorization_value: NonMaskedStr | None = None



#
# Google Gemini
class GeminiOptions(OpenAiOptions):
    pass


class MaskedGeminiOptions(MaskedOpenAiOptions):
    pass


class UpdateGeminiOptions(UpdateOpenAiOptions):
    pass


#
# Mistral AI
class MistralOptions(OpenAiOptions):
    pass


class MaskedMistralOptions(MaskedOpenAiOptions):
    pass


class UpdateMistralOptions(UpdateOpenAiOptions):
    pass


#
# Anthropic
class AnthropicOptions(OpenAiOptions):
    pass


class MaskedAnthropicOptions(MaskedOpenAiOptions):
    pass


class UpdateAnthropicOptions(UpdateOpenAiOptions):
    pass


#
# Microsoft Azure AI
class AzureOptions(BaseProviderOptions):
    api_key: str
    endpoint: str
    deployment: str
    version: str

    def key_suffix(self):
        return self.api_key[-5:]


class MaskedAzureOptions(AzureOptions):
    api_key: MaskedStr


class UpdateAzureOptions(AzureOptions):
    api_key: NonMaskedStr


#
# Amazon Bedrock
class BedrockOptions(BaseProviderOptions):
    access_key_id: str
    access_key: str
    region: str

    def key_suffix(self):
        return self.access_key[-5:]

    @computed_field
    @property
    def auto_endpoint_url(self) -> str:
        return f'https://bedrock-runtime.{self.region}.amazonaws.com'

    @computed_field
    @property
    def region_model_prefix(self) -> str:
        return self.get_region_model_prefix(self.region)

    @classmethod
    @lru_cache(100)
    def get_region_model_prefix(cls, region: str):
        if region.startswith('us-gov-'):
            return 'us-gov.'

        if region.startswith('us-'):
            return 'us.'

        if region.startswith('ap-'):
            return 'apac.'

        if region.startswith('eu-'):
            return 'eu.'

        return ''


class MaskedBedrockOptions(BedrockOptions):
    access_key: MaskedStr


class UpdateBedrockOptions(BedrockOptions):
    access_key: NonMaskedStr


options_for_create: dict[LlmProvider, type[BaseModel]] = {
    'OpenAI': OpenAiOptions,
    'Azure': AzureOptions,
    'Bedrock': BedrockOptions,
    'Gemini': GeminiOptions,
    'Mistral': MistralOptions,
    'Anthropic': AnthropicOptions,
    'OpenAICompatible': OpenAICompatibleOptions,
    'AzureMLChatScore': CustomProviderOptions,
    'AzureMLPromptScore': CustomProviderOptions,
    'AzureMLEmbeddingScore': CustomProviderOptions,
}

options_for_update: dict[LlmProvider, type[BaseModel]] = {
    'OpenAI': UpdateOpenAiOptions,
    'Azure': UpdateAzureOptions,
    'Bedrock': UpdateBedrockOptions,
    'Gemini': UpdateGeminiOptions,
    'Mistral': UpdateMistralOptions,
    'Anthropic': UpdateAnthropicOptions,
    'OpenAICompatible': UpdateOpenAICompatibleOptions,
    'AzureMLChatScore': UpdateCustomProviderOptions,
    'AzureMLPromptScore': UpdateCustomProviderOptions,
    'AzureMLEmbeddingScore': UpdateCustomProviderOptions,
}


class Llm(AppDocument, BaseLlm):
    ModelObject: ClassVar = ModelObject
    scoped_context_enable: ClassVar[bool] = True

    provider: LlmProvider
    status: LlmStatus = 'Pending'

    ownership_id: PydanticObjectId | None = None
    color: Color | None = None
    created_by: str | None = None
    added_at: datetime = Field(default_factory=datetime.utcnow)
    unbudgeted_until: datetime | None = None

    tags: list[str] | None = None
    system_tags: list[SysTag] | None = None

    openai: OpenAiOptions | None = None
    azure: AzureOptions | None = None
    bedrock: BedrockOptions | None = None
    gemini: GeminiOptions | None = None
    mistral: MistralOptions | None = None
    anthropic: AnthropicOptions | None = None
    openaicompatible: OpenAICompatibleOptions | None = None
    azuremlchatscore: CustomProviderOptions | None = None
    azuremlpromptscore: CustomProviderOptions | None = None
    azuremlembeddingscore: CustomProviderOptions | None = None

    class Settings:
        indexes = [
            IndexModel(['scopes']),
            IndexModel(['ownership_id']),
        ]

    def get_options(self) -> BaseProviderOptions | None:
        return getattr(self, self.provider.lower(), None)

    @computed_field
    def api_key_suffix(self) -> str:
        options = self.get_options()
        return options.key_suffix() if options else ''

    @model_validator(mode='after')
    def valdate_after(self):
        if not self.color:
            self.color = object_id_color(self.id)

        if not self.name:
            self.name = ':'.join((self.provider, self.api_key_suffix))

        return self

    @classmethod
    @Unscoped()
    async def delete_relations(cls, id: ObjectId):
        await Apikey.purge_llm(id)
        await ModelPool.purge_llm(id)
        await cls.touch_related(id)

    @Unscoped()
    async def update_relations(self):
        await ModelPool.update_llm(self)
        await self.touch_related(self.id)

    @classmethod
    @Unscoped()
    async def related_modelpool_ids(cls, llm_id: ObjectId) -> list[ObjectId]:
        q = ModelPool.get_motor_collection().find(
            {'models.llm_id': llm_id},
            projection={'_id': 1},
        )
        return [i['_id'] async for i in q]

    @classmethod
    @Unscoped()
    async def touch_related(cls, llm_id: ObjectId):
        await Apikey.set_updated_at(
            {
                '$or': [
                    {'llm_access': llm_id},
                    {'pool_access': {'$in': await cls.related_modelpool_ids(llm_id)}},
                ]
            }
        )

    @staticmethod
    def error_from_mongo(e):
        if value := e.details['keyValue'].get('models.alias'):
            message = f"The alias '{value}' is already in use"
            return errors.AliasAlreadyExistError(message, value=value)

        return e

    @classmethod
    async def update_one_from(cls, filter, source: BaseModel, **kwargs):
        fields: dict = cls.custom_encoder.encode(source)
        # Use dot-notation to update, not overwrite nestings
        # To avoid losing NonMaskedStr fields
        fields = flatten_onelevel(fields)
        return await cls.find_one(filter).update_one({'$set': fields}, **kwargs)


class LlmCreateDto(BaseCreateModel):
    name: str = ''
    color: Color | None = None
    provider: LlmProvider
    models: list[Llm.ModelObject]

    tags: list[str] | None = None

    openai: OpenAiOptions | None = None
    azure: AzureOptions | None = None
    bedrock: BedrockOptions | None = None
    gemini: GeminiOptions | None = None
    mistral: MistralOptions | None = None
    anthropic: AnthropicOptions | None = None
    openaicompatible: OpenAICompatibleOptions | None = None
    azuremlchatscore: CustomProviderOptions | None = None
    azuremlpromptscore: CustomProviderOptions | None = None
    azuremlembeddingscore: CustomProviderOptions | None = None

    @model_validator(mode='after')
    def valdate_after(self):
        validate_provider_data(self, required=True)

        self.models = [*filter(itemgetter('enabled'), self.models)]

        return self


class LlmUpdateDto(BaseUpdateModel):
    provider: LlmProvider
    name: str | None = None
    color: Color | None = None
    models: list[Llm.ModelObject] | None = None

    tags: list[str] | None = None

    openai: UpdateOpenAiOptions | None = None
    azure: UpdateAzureOptions | None = None
    bedrock: UpdateBedrockOptions | None = None
    gemini: UpdateGeminiOptions | None = None
    mistral: UpdateMistralOptions | None = None
    anthropic: UpdateAnthropicOptions | None = None
    openaicompatible: UpdateOpenAICompatibleOptions | None = None
    azuremlchatscore: UpdateCustomProviderOptions | None = None
    azuremlpromptscore: UpdateCustomProviderOptions | None = None
    azuremlembeddingscore: UpdateCustomProviderOptions | None = None

    @model_validator(mode='after')
    def valdate_after(self):
        validate_provider_data(self, required=False)

        if self.models:
            self.models = [*filter(itemgetter('enabled'), self.models)]

        return self


class LlmOutDto(Llm):
    scopes: list[str] | None = None
    name: str

    tags: list[str] | None = None

    openai: MaskedOpenAiOptions | None = None
    azure: MaskedAzureOptions | None = None
    bedrock: MaskedBedrockOptions | None = None
    gemini: MaskedGeminiOptions | None = None
    mistral: MaskedMistralOptions | None = None
    anthropic: MaskedAnthropicOptions | None = None
    openaicompatible: MaskedOpenAICompatibleOptions | None = None
    azuremlchatscore: MaskedCustomProviderOptions | None = None
    azuremlpromptscore: MaskedCustomProviderOptions | None = None
    azuremlembeddingscore: MaskedCustomProviderOptions | None = None


def validate_provider_data(llm: LlmCreateDto | LlmUpdateDto, *, required: bool):
    options_field = llm.provider.lower()
    options = getattr(llm, options_field, None)

    # Remove unrelated providers to avoid inconsistent data
    llm.openai = None
    llm.azure = None
    llm.bedrock = None
    llm.gemini = None
    llm.mistral = None
    llm.anthropic = None
    llm.openaicompatible = None
    llm.azuremlchatscore = None
    llm.azuremlpromptscore = None
    llm.azuremlembeddingscore = None
    setattr(llm, options_field, options)

    if required and not options:
        raise custom_validation_error(
            type(llm).__name__,
            'missing',
            f'{llm.provider} provider requires `{options_field}` options object',
            (options_field,),
        )
