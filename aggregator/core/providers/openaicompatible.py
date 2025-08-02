import litellm
import logging

from typing import *
from trussed.openai import CustomAsyncOpenAI
from trussed.typedef.openai import ChatCompletionCreate, EmbeddingCreate

from . import Provider, Context, LiteLlmTrackingMixin
from .openai import LiteLlmOpenAiProvider


# Initialize logger for this module
logger = logging.getLogger(__name__)


class LiteLlmOpenAiCustomProviderBase(Provider):
    name = 'OpenAICompatible'
    sdk: CustomAsyncOpenAI

    async def initialize(self):
        logger.info("Initializing LiteLlmOpenAiCustomProviderBase")
        assert self.llm.openaicompatible, f'The {self.name} LLM does not have provider options'
        self.sdk = CustomAsyncOpenAI.from_options(self.llm.openaicompatible)

        logger.info("Initialization complete")

    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        logger.debug(f"Starting completion with kwargs: {kwargs}")
        kwargs['model'] = 'openai/' + kwargs['model']

        try:
            with ctx.response_time:
                result = await litellm.acompletion(
                    client=self.sdk,
                    timeout=self.llm.openaicompatible.timeout,
                    **kwargs,
                )
            logger.debug("Completion successful")
            return result

        except Exception as e:
            logger.error(f"Error during completion: {e}", exc_info=True)
            raise self.exception(e) from None

    async def embedding(self, ctx: Context, **kwargs: Unpack[EmbeddingCreate]):
        kwargs['model'] = 'openai/' + kwargs['model']

        try:
            with ctx.response_time:
                response = await litellm.aembedding(
                    client=self.sdk,
                    timeout=self.llm.openaicompatible.timeout,
                    **kwargs,
                )

                return response
        except Exception as e:
            raise self.exception(e) from None

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        logger.exception("Exception in LiteLlmOpenAiCustomProviderBase.exception")
        return LiteLlmOpenAiProvider.exception(e)


class LiteLlmOpenAiCustomProvider(LiteLlmTrackingMixin, LiteLlmOpenAiCustomProviderBase):
    logger.info("LiteLlmOpenAiCustomProvider initialized with LiteLlmTrackingMixin")
