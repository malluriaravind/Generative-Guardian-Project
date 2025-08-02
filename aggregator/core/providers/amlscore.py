import logging

from typing import *
from httpx import HTTPStatusError, HTTPError
from trussed.amlscore import (
    BaseScoringClient,
    ChatScoreClient,
    PromptScoreClient,
    EmbeddingScoreClient,
    ModelResponse,
    EmbeddingResponse
)
from trussed.utils import extract_strings
from trussed.amlscore import BadResponseError
from trussed.typedef.amlscore import ScoreChatMessage
from trussed.typedef.openai import ChatCompletionCreate, EmbeddingCreate
from trussed.models.llm import LlmFeature, TrfTokenizer

from core.errors import ProviderError
from core.trf import get_trf_tokenizer
from . import Provider, Context, LiteLlmTrackingMixin


logger = logging.getLogger(__name__)


def try_compute_usage(
    messages: list[ScoreChatMessage],
    model_response: ModelResponse,
    tokinfo: TrfTokenizer | None,
):
    if tokinfo is None:
        return
    
    usage = model_response.usage

    try:
        tokenizer = get_trf_tokenizer(tokinfo.path, tokinfo.revision)

        completion = model_response.choices[0].message.content
        usage.completion_tokens = len(tokenizer.encode(completion))

        if tokenizer.chat_template:
            usage.prompt_tokens = len(tokenizer.apply_chat_template(messages))
        else:
            prompt = ''.join(i['content'] for i in messages)
            usage.prompt_tokens = len(tokenizer.encode(prompt))

    except Exception as e:
        logger.error(f"Error during tokens counting: {e}")

    finally:
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens


def try_compute_embedding_usage(
    input: str | list,
    embedding_response: EmbeddingResponse,
    tokinfo: TrfTokenizer | None,
):
    if tokinfo is None:
        return

    usage = embedding_response.usage
    prompt_tokens = 0

    try:
        tokenizer = get_trf_tokenizer(tokinfo.path, tokinfo.revision)
        prompt_tokens = sum(len(tokenizer.encode(i)) for i in extract_strings(input))

    except Exception as e:
        logger.error(f"Error during token counting: {e}")

    usage.prompt_tokens = prompt_tokens
    usage.total_tokens = prompt_tokens


class AzureMLScoreProviderBase[T](Provider):
    name = 'AzureMLChatScore'
    features = frozenset[LlmFeature](['messages'])
    sdk: BaseScoringClient
    tokinfo: TrfTokenizer

    def get_raw_body(self, ctx: Context) -> dict:
        raise NotImplementedError

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        if isinstance(e, BadResponseError):
            if e.response.status_code == 200:
                http_code = 400
            else:
                http_code = e.response.status_code
    
            error = ProviderError(e.message, http_code=http_code)
            return error

        if isinstance(e, HTTPStatusError):
            message = f'{e.response.text.strip() or e}'
            error = ProviderError(message, http_code=e.response.status_code)
            return error

        if isinstance(e, HTTPError):
            message = f'{type(e).__name__} {e}'
            error = ProviderError(message)
            return error

        return e


class AzureMLChatScoreProviderBase(AzureMLScoreProviderBase):
    name = 'AzureMLChatScore'
    sdk: ChatScoreClient

    async def initialize(self):
        logger.info('Initializing AzureMLChatScoreProviderBase')
        assert self.llm.azuremlchatscore, f'The {self.name} LLM does not have provider options'
        self.sdk = ChatScoreClient.from_options(self.llm.azuremlchatscore)

        # OpanAI body is already supported. Do not transform it
        if self.llm.azuremlchatscore.openai_input:
            self.sdk.use_openai_to_native = False

        self.tokinfo = self.llm.azuremlchatscore.tokenizer
    
    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        raw = self.get_raw_body(ctx)

        try:
            with ctx.response_time:
                response = await self.sdk.chat_completion(raw, **kwargs)

            try_compute_usage(kwargs['messages'], response, self.tokinfo)

            if ctx.modelinfo is not None:
                response.model = ctx.modelinfo.name

            return response

        except Exception as e:
            raise self.exception(e) from None

    def get_raw_body(self, ctx: Context):
        return ctx.misc.get('raw_amlchatscore')


class AzureMLPromptScoreProviderBase(AzureMLChatScoreProviderBase):
    name = 'AzureMLPromptScore'
    sdk: PromptScoreClient

    async def initialize(self):
        logger.info('Initializing AzureMLChatScoreProviderBase')
        assert self.llm.azuremlpromptscore, f'The {self.name} LLM does not have provider options'
        self.sdk = PromptScoreClient.from_options(self.llm.azuremlpromptscore)
        self.tokinfo = self.llm.azuremlpromptscore.tokenizer

    def get_raw_body(self, ctx: Context):
        return ctx.misc.get('raw_amlpromptscore')


class AzureMLEmbeddingScoreProviderBase(AzureMLScoreProviderBase):
    name = 'AzureMLEmbeddingScore'
    sdk: EmbeddingScoreClient

    async def initialize(self):
        logger.info('Initializing AzureMLChatScoreProviderBase')
        assert self.llm.azuremlembeddingscore, f'The {self.name} LLM does not have provider options'
        self.sdk = EmbeddingScoreClient.from_options(self.llm.azuremlembeddingscore)

        # OpanAI body is already supported. Do not transform it
        if self.llm.azuremlembeddingscore.openai_input:
            self.sdk.use_openai_to_native = False

        self.tokinfo = self.llm.azuremlembeddingscore.tokenizer
    
    async def embedding(self, ctx: Context, **kwargs: Unpack[EmbeddingCreate]):
        raw = self.get_raw_body(ctx)

        try:
            with ctx.response_time:
                response = await self.sdk.embedding(raw, **kwargs)

            try_compute_embedding_usage(kwargs['input'], response, self.tokinfo)

            if ctx.modelinfo is not None:
                response.model = ctx.modelinfo.name

            return response

        except Exception as e:
            raise self.exception(e) from None


    def get_raw_body(self, ctx: Context):
        return ctx.misc.get('raw_amlembeddingscore')


class AzureMLChatScoreProvider(LiteLlmTrackingMixin, AzureMLChatScoreProviderBase):
    ...


class AzureMLPromptScoreProvider(LiteLlmTrackingMixin, AzureMLPromptScoreProviderBase):
    ...


class AzureMLEmbeddingScoreProvider(LiteLlmTrackingMixin, AzureMLEmbeddingScoreProviderBase):
    ...