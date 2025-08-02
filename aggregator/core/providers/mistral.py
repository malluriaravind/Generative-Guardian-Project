import httpx
import litellm

from typing import *
from openai import AsyncOpenAI, APIError as OpenAiNativeError

from ..errors import ProviderError
from . import Provider, Context, ChatCompletionCreate, LiteLlmTrackingMixin
from .openai import LiteLlmOpenAiProvider
from . import find_first_exception


class LiteLlmMistralProviderBase(Provider):
    name = 'Mistral'
    sdk: AsyncOpenAI
    http_client = httpx.AsyncClient()

    async def initialize(self):
        assert self.llm.mistral, f'The {self.name} LLM does not have provider options'

        self.sdk = AsyncOpenAI(
            base_url='https://api.mistral.ai/v1',
            http_client=self.http_client,
            api_key=self.llm.mistral.api_key,
        )

    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        kwargs['model'] = 'mistral/' + kwargs['model']

        try:
            with ctx.response_time:
                return await litellm.acompletion(
                    client=self.sdk,
                    base_url=str(self.sdk.base_url),
                    api_key=self.sdk.api_key,
                    timeout=self.llm.mistral.timeout,
                    **kwargs,
                )
        except Exception as e:
            raise self.exception(e) from None

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        message: str = None

        if native := find_first_exception(e, OpenAiNativeError):
            if isinstance(native.body, dict):
                message = make_message(native.body)

            generic = ProviderError(message or native.message)
            generic.openai_code = native.code or generic.openai_code
            generic.openai_type = native.type or generic.openai_type

            if status_code := getattr(native, 'status_code', None):
                generic.http_code = status_code

            return generic

        return e


def make_message(body: dict):
    if isinstance(body.get('message'), dict):
        if detail := body['message'].get('detail'):
            error = detail[0]
            path = '.'.join(map(str, error['loc'][1:]))
            message = error.get('ctx', {}).get('reason') or error['msg'].capitalize()
            return f"{message} - '{path}'"

    return body.get('message')


class LiteLlmMistralProvider(LiteLlmTrackingMixin, LiteLlmMistralProviderBase): ...
