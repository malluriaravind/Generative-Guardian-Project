import httpx
import litellm
import logging

from typing import *
from openai import AsyncAzureOpenAI

from . import Provider, Context, ChatCompletionCreate, LiteLlmTrackingMixin
from .openai import LiteLlmOpenAiProvider

logger = logging.getLogger(__name__)

class LiteLlmAzureProviderBase(Provider):
    name = 'Azure'
    sdk: AsyncAzureOpenAI
    http_client = httpx.AsyncClient()

    async def initialize(self):
        logger.debug("Initializing LiteLlmAzureProviderBase")
        assert self.llm.azure, f'The {self.name} LLM does not have provider options'
        logger.info(f"Azure configuration found: {self.llm.azure}")

        self.sdk = AsyncAzureOpenAI(
            http_client=self.http_client,
            api_key=self.llm.azure.api_key,
            azure_endpoint=self.llm.azure.endpoint,
            azure_deployment=self.llm.azure.deployment,
            api_version=self.llm.azure.version,
        )
        logger.info("AsyncAzureOpenAI SDK initialized successfully")

    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        kwargs['model'] = 'azure/' + kwargs['model']

        try:
            with ctx.response_time:
                response = await litellm.acompletion(
                    client=self.sdk,
                    base_url=str(self.sdk.base_url),
                    api_version=self.sdk._api_version,
                    api_key=self.sdk.api_key,
                    timeout=self.llm.azure.timeout,
                    **kwargs,
                )

            return response
        except Exception as e:
            raise self.exception(e) from None

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        return LiteLlmOpenAiProvider.exception(e)


class LiteLlmAzureProvider(LiteLlmTrackingMixin, LiteLlmAzureProviderBase): ...
