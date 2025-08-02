import httpx
import attrs
import logging

from typing import *
from pydantic import BaseModel, Field, ValidationError
from litellm.types.utils import ModelResponse, EmbeddingResponse, Embedding

from .typedef.amlscore import (
    ScorePromptPayload,
    ScoreChatPayload,
    ScoreEmbeddingPayload,
    ScoreParameters,
    ScoreChatInputData,
)
from .typedef.openai import ChatCompletionCreate, ChatCompletionMessage, EmbeddingCreate
from .models.llm import CustomProviderOptions, CustomLlmOptions


log = logging.getLogger(__name__)
logreq = logging.getLogger('tc.reqres')


def openai_to_amlchatscore(
    body: ChatCompletionCreate,
    raw: ScoreChatPayload | None = None,
) -> ScoreChatPayload:
    messages = [i for i in body['messages'] if i['role'] in ('user', 'assistant', 'system')]

    payload = ScoreChatPayload(raw or {})
    input_data = payload.setdefault('input_data', {})
    input_data['input_string'] = messages
    parameters = input_data.setdefault('parameters', {})

    if (i := body.get('temperature')) is not None:
        parameters['temperature'] = i
    
    if (i := body.get('max_tokens')) is not None:
        parameters['max_new_tokens'] = i
    
    if (i := body.get('top_p')) is not None:
        parameters['top_p'] = i

    return payload


def amlchatscore_to_openai(body: ScoreChatPayload, model: str) -> ChatCompletionCreate:
    if 'input_data' in body:
        messages = body['input_data'].get('input_string', [])
    else:
        messages = []

    chatcompletion = ChatCompletionCreate(messages=messages, model=model) # type: ignore

    if input_data := body.get('input_data'):
        if parameters := input_data.get('parameters'):
            if 'temperature' in parameters:
                chatcompletion['temperature'] = parameters['temperature']
    
            if 'max_new_tokens' in parameters:
                chatcompletion['max_tokens'] = parameters['max_new_tokens']
    
            if 'top_p' in parameters:
                chatcompletion['top_p'] = parameters['top_p']

    return chatcompletion


def amlpromptscore_to_openai(body: ScorePromptPayload, model: str) -> ChatCompletionCreate:
    messages = [ChatCompletionMessage(role='user', content=body['prompt'])]
    chatcompletion = ChatCompletionCreate(messages=messages, model=model)

    return chatcompletion


def openai_to_amlpromptscore(
    body: ChatCompletionCreate,
    raw: ScorePromptPayload | None = None,
):
    payload = {**(raw or {})}
    payload['prompt'] = ' '.join(i['content'] for i in body['messages'])
    return payload


def amlembeddingscore_to_openai(body: ScoreEmbeddingPayload, model: str):
    return EmbeddingCreate(input=body['documents'], model=model)


def openai_to_amlembeddingscore(
    body: EmbeddingCreate,
    raw: ScoreEmbeddingPayload | None = None,
):
    payload = {**(raw or {})}
    payload['documents'] = body['input']
    return payload


class ScoreResponsePayload(BaseModel, extra='allow'):
    output: str


@attrs.define
class ScoreBaseResponse:
    payload: Any
    http_response: httpx.Response


@attrs.define
class ScoreResponse(ScoreBaseResponse):
    payload: ScoreResponsePayload


@attrs.define
class ScoreEmbeddingResponse(ScoreBaseResponse):
    payload: list


@attrs.define
class BadResponseError(Exception):
    message: str
    response: httpx.Response


default_http_client = httpx.AsyncClient(follow_redirects=True)


@attrs.define
class BaseScoringClient:
    url: str
    headers: dict[str, str] | None = None
    timeout: float = 5
    use_openai_to_native: bool = True
    http_client: httpx.AsyncClient = default_http_client

    @classmethod
    def from_options(cls, options: CustomLlmOptions) -> Self:
        options.ensure_bearer()

        http_client = httpx.AsyncClient(
            limits=httpx.Limits(
                max_connections=options.max_connections,
                max_keepalive_connections=options.max_keepalive_connections,
            ),
            follow_redirects=True,
        )

        return cls(
            url=cls.get_url(options),
            headers=options.make_headers(with_authorization=True),
            timeout=options.timeout,
            http_client=http_client,
        )
    
    @classmethod
    def get_url(cls, options: CustomLlmOptions) -> str:
        raise NotImplementedError

    async def request(self, payload):
        response = await self.http_client.post(
            url=self.url,
            json=payload,
            headers=self.headers,
            timeout=self.timeout,
        )

        response.raise_for_status()

        try:
            body = response.json()
        except Exception as e:
            raise BadResponseError(message=f'Unexpected response: {e}', response=response) from None

        return ScoreBaseResponse(body, http_response=response)


@attrs.define
class ChatScoreClient(BaseScoringClient):
    @classmethod
    def from_options(cls, options: CustomProviderOptions) -> Self:
        self = super().from_options(options)

        if options.openai_input:
            self.use_openai_to_native = False

        return self

    @classmethod
    def get_url(cls, options: CustomLlmOptions):
        if not options.completion_endpoint:
            raise ValueError('completion_endpoint not set')

        return options.completion_endpoint

    async def chat_completion(
        self,
        raw: ScoreChatPayload | None = None,
        **kwargs: Unpack[ChatCompletionCreate],
    ):
        if self.use_openai_to_native:
            payload = openai_to_amlchatscore(kwargs, raw)
        else:
            payload = kwargs

        response = await self.request(payload)

        if not isinstance(response.payload, dict):
            raise BadResponseError(
                message=f'Unexpected response: {response.payload}',
                response=response.http_response,
            )

        content = response.payload.get('output') or response.payload.get('text', '')
        return make_model_response(str(content), response.http_response)


@attrs.define
class PromptScoreClient(ChatScoreClient):
    async def chat_completion(
        self,
        raw: ScorePromptPayload | None = None,
        **kwargs: Unpack[ChatCompletionCreate],
    ):
        if self.use_openai_to_native:
            payload = openai_to_amlpromptscore(kwargs, raw)
        else:
            payload = kwargs

        response = await self.request(payload)

        if not isinstance(response.payload, dict):
            raise BadResponseError(
                message=f'Unexpected response: {response.payload}',
                response=response.http_response,
            )

        content = response.payload.get('output') or response.payload.get('text', '')
        return make_model_response(str(content), response.http_response)


@attrs.define
class EmbeddingScoreClient(BaseScoringClient):
    @classmethod
    def get_url(cls, options: CustomLlmOptions):
        if not options.embedding_endpoint:
            raise ValueError('embedding_endpoint not set')

        return options.embedding_endpoint

    async def embedding(
        self,
        raw: ScoreEmbeddingPayload | None = None,
        **kwargs: Unpack[EmbeddingCreate],
    ):

        if self.use_openai_to_native:
            payload = openai_to_amlembeddingscore(kwargs, raw)
        else:
            payload = kwargs

        response = await self.request(payload)

        if not isinstance(response.payload, list):
            raise BadResponseError(
                message=f'Unexpected response: {response.payload}',
                response=response.http_response,
            )

        return make_embedding_response(response.payload, response.http_response)


def make_model_response(output: str, response: httpx.Response):
    modelresponse = ModelResponse()
    modelresponse.choices[0].message.content = output # type: ignore
    modelresponse.usage.prompt_tokens = 0 # type: ignore
    modelresponse.usage.completion_tokens = 0 # type: ignore
    modelresponse.usage.total_tokens = 0 # type: ignore
    modelresponse._response_headers = response.headers
    return modelresponse


def make_embedding_response(ebedding: list, response: httpx.Response):
    embeddingresponse = EmbeddingResponse()
    embeddingresponse.data = [Embedding(embedding=ebedding, index=0, object='embedding')]
    embeddingresponse.usage.prompt_tokens = 0 # type: ignore
    embeddingresponse.usage.total_tokens = 0 # type: ignore
    embeddingresponse._response_headers = response.headers
    return embeddingresponse

