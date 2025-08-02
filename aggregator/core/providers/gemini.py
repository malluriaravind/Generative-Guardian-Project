import logging
import litellm
import google.generativeai.client as client
import google.ai.generativelanguage as glm

from typing import *
from contextvars import ContextVar

from httpx import HTTPStatusError
from google.generativeai.client import _ClientManager
from google.api_core.exceptions import GoogleAPICallError

from core.errors import ProviderError
from . import Provider, Context, ChatCompletionCreate, LiteLlmTrackingMixin
from . import find_first_exception


log = logging.getLogger(__name__)

ctx_client = ContextVar[glm.GenerativeServiceClient | None]('client', default=None)
ctx_client_async = ContextVar[glm.GenerativeServiceAsyncClient | None]('client_async', default=None)


def get_default_generative_client():
    log.info('Get client')
    assert (client := ctx_client.get()), 'Google Generative AI client is not set'
    return client


def get_default_generative_async_client():
    log.info('Get client async')
    assert (client := ctx_client_async.get()), 'Google Async Generative AI client is not set'
    return client


client.get_default_generative_client = get_default_generative_client
client.get_default_generative_async_client = get_default_generative_async_client


class LiteLlmGeminiProviderBase(Provider):
    name = 'Gemini'

    async def initialize(self):
        assert self.llm.gemini, f'The {self.name} LLM does not have provider options'

        client_manager = _ClientManager()
        client_manager.configure(api_key=self.llm.gemini.api_key)

        self.client = client_manager.get_default_client('generative')
        self.client_async = client_manager.get_default_client('generative_async')

    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        kwargs['model'] = 'gemini/' + kwargs['model']

        token = ctx_client.set(self.client)
        token_async = ctx_client_async.set(self.client_async)

        try:
            with ctx.response_time:
                return await litellm.acompletion(
                    api_key=self.llm.gemini.api_key,
                    timeout=self.llm.gemini.timeout,
                    **kwargs,
                )
        except Exception as e:
            raise self.exception(e) from None
        finally:
            ctx_client.reset(token)
            ctx_client_async.reset(token_async)

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        if httpx_error := find_first_exception(e, HTTPStatusError):
            try:
                payload = httpx_error.response.json()
                message = payload.get('error', {}).get('message') or str(httpx_error)
            except ValueError:
                message = str(httpx_error)

            return ProviderError(message, http_code=httpx_error.response.status_code)

        if native := find_first_exception(e, GoogleAPICallError):
            generic = ProviderError(str(native))
            generic.http_code = int(native.code)
            return generic

        return e


class LiteLlmGeminiProvider(LiteLlmTrackingMixin, LiteLlmGeminiProviderBase): ...
