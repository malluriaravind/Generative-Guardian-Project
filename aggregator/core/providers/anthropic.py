import litellm
import logging

from httpx import HTTPStatusError

from typing import *

from core.errors import ProviderError
from . import Provider, Context, ChatCompletionCreate, LiteLlmTrackingMixin
from . import find_first_exception


logger = logging.getLogger(__name__)


class LiteLlmAnthropicProviderBase(Provider):
    name = 'Anthropic'

    async def initialize(self):
        logger.info(f'Initializing provider: {self.name}')
        assert self.llm.anthropic, f'The {self.name} LLM does not have provider options'
        logger.debug(f'{self.name} provider initialized with LLM options: {self.llm.anthropic}')

    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        kwargs['model'] = 'anthropic/' + kwargs['model']
        logger.debug(f'Modified model name: {kwargs["model"]}')

        try:
            with ctx.response_time:
                response = await litellm.acompletion(
                    api_key=self.llm.anthropic.api_key,
                    timeout=self.llm.anthropic.timeout,
                    **kwargs,
                )
                logger.info(f'Completion successful for model: {kwargs["model"]}')
                return response
        except Exception as e:
            raise self.exception(e) from None

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        if httpx_error := find_first_exception(e, HTTPStatusError):
            try:
                payload = httpx_error.response.json()
                message = payload.get('error', {}).get('message') or str(httpx_error)
                logger.debug(f'HTTPStatusError payload: {payload}')
            except ValueError:
                message = str(httpx_error)
                logger.debug('Failed to parse JSON from HTTPStatusError response')

            error = ProviderError(message, http_code=httpx_error.response.status_code)
            logger.info(f'Raised ProviderError with HTTP code {error.http_code}')
            return error

        logger.exception('Unhandled exception type encountered')
        return e


class LiteLlmAnthropicProvider(LiteLlmTrackingMixin, LiteLlmAnthropicProviderBase): ...
