import httpx
import litellm
import logging

from typing import *
from openai import AsyncOpenAI, APIError as OpenAiNativeError, APIStatusError

from trussed.typedef.openai import ChatCompletionCreate, EmbeddingCreate
from core.errors import ProviderError

from . import Provider, Context, LiteLlmTrackingMixin
from . import find_first_exception


# Initialize logger
logger = logging.getLogger(__name__)


class LiteLlmOpenAiProviderBase(Provider):
    name = 'OpenAI'
    sdk: AsyncOpenAI
    http_client = httpx.AsyncClient()

    async def initialize(self):
        assert self.llm.openai, f'The {self.name} LLM does not have provider options'

        self.sdk = AsyncOpenAI(
            http_client=self.http_client,
            api_key=self.llm.openai.api_key,
        )
        logger.debug(f"AsyncOpenAI SDK initialized with API key: {self.llm.openai.api_key}")

    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        kwargs['model'] = 'openai/' + kwargs['model']

        try:
            with ctx.response_time:
                response = await litellm.acompletion(
                    client=self.sdk,
                    base_url=str(self.sdk.base_url),
                    api_key=self.sdk.api_key,
                    timeout=self.llm.openai.timeout,
                    **kwargs,
                )

                return response
        except Exception as e:
            raise self.exception(e) from None
        
    async def embedding(self, ctx: Context, **kwargs: Unpack[EmbeddingCreate]):
        kwargs['model'] = 'openai/' + kwargs['model']

        try:
            with ctx.response_time:
                response = await litellm.aembedding(
                    client=self.sdk,
                    base_url=str(self.sdk.base_url),
                    api_key=self.sdk.api_key,
                    timeout=self.llm.openai.timeout,
                    **kwargs,
                )

                return response
        except Exception as e:
            raise self.exception(e) from None

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        message: str = None

        if native := find_first_exception(e, OpenAiNativeError):
            if isinstance(getattr(native, 'body', None), dict):
                message = native.body.get('message')

            generic = ProviderError(message or native.message)
            generic.openai_code = getattr(native, 'code', None) or generic.openai_code
            generic.openai_type = getattr(native, 'type', None) or generic.openai_type

            if isinstance(native, APIStatusError):
                generic.http_code = native.status_code

            return generic

        return e


class LiteLlmOpenAiProvider(LiteLlmTrackingMixin, LiteLlmOpenAiProviderBase): ...
