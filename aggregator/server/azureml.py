import logging

from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

from fastapi.responses import ORJSONResponse, HTMLResponse
from pydantic import ValidationError
from fastapi.exceptions import RequestValidationError
from typing import *

from trussed.amlscore import amlchatscore_to_openai, amlpromptscore_to_openai, amlembeddingscore_to_openai
from trussed.typedef.amlscore import ScoreChatPayload, ScorePromptPayload, ScoreEmbeddingPayload
from trussed.typedef.openai import ChatCompletionCreate, EmbeddingCreate
from trussed.utils.oas import get_rapi_html

from core.logs import log_request, log_response
from core.errors import ApiException, InstantApiResponse
from server.deps.access import UseContext

from core.providers import Context, Provider
from core.providers.openai import LiteLlmOpenAiProvider
from core.providers.azure import LiteLlmAzureProvider
from core.providers.bedrock import LiteLlmBedrockProvider
from core.providers.gemini import LiteLlmGeminiProvider
from core.providers.mistral import LiteLlmMistralProvider
from core.providers.anthropic import LiteLlmAnthropicProvider
from core.providers.openaicompatible import LiteLlmOpenAiCustomProvider
from core.providers.amlscore import AzureMLChatScoreProvider, AzureMLPromptScoreProvider, AzureMLEmbeddingScoreProvider


log = logger = logging.getLogger(__name__)
logreq = logging.getLogger('tc.reqres')
app = FastAPI()

Provider.register(LiteLlmOpenAiProvider)
Provider.register(LiteLlmAzureProvider)
Provider.register(LiteLlmBedrockProvider)
Provider.register(LiteLlmGeminiProvider)
Provider.register(LiteLlmMistralProvider)
Provider.register(LiteLlmAnthropicProvider)
Provider.register(LiteLlmOpenAiCustomProvider)
Provider.register(AzureMLChatScoreProvider)
Provider.register(AzureMLPromptScoreProvider)
Provider.register(AzureMLEmbeddingScoreProvider)


@app.exception_handler(Exception)
async def handle_exception(request: Request, e: Exception):
    log.exception(f'Unhandled exception: {repr(e)}')
    content = 'Something went wrong on Trussed Controller side'
    log_response('LHS', content)
    return PlainTextResponse(content, 500)


@app.exception_handler(ApiException)
async def handle_api_exception(request: Request, e: ApiException):
    log.error('Request rejected: %s', e)
    log_response('LHS', e.message)
    return PlainTextResponse(e.message, e.http_code, e.response_headers)


@app.exception_handler(InstantApiResponse)
async def handle_api_instant_response(request: Request, e: InstantApiResponse):
    log.info(f'Returning instant response with status {e.http_code}')

    # TODO: Refactoring needed
    if choices := e.response_body.get('choices'):
        content = {'output': choices[0]['message']['content']}
    else:
        content = {'output': ''}

    log_response('LHS', content)
    return ORJSONResponse(content, e.http_code, e.response_headers)


@app.exception_handler(ValidationError)
@app.exception_handler(RequestValidationError)
def handle_validation_exception(request: Request, e: RequestValidationError):
    log.error(f'Validation error: {repr(e)}', exc_info=True)

    if isinstance(e, RequestValidationError):
        # FastAPI always prepends 'body' to the location, remove it
        loc_slice = slice(1, None, None)
    else:
        loc_slice = slice(None, None, None)

    error = next(iter(e.errors()))
    path = '.'.join(map(str, error['loc'][loc_slice]))
    message = error.get('ctx', {}).get('reason') or error['msg'].capitalize()

    content = f"{message} - '{path}'"
    log_response('LHS', content)
    return PlainTextResponse(content, status_code=422)


@app.get('/reference')
async def spec_reference_html(req: Request) -> HTMLResponse:
    return HTMLResponse(get_rapi_html('openapi.json'))


# Hot fix: make model optional
class ChatCompletionCreate(ChatCompletionCreate, total=False):
    model: str


# TODO: DRY
@app.post('/chat/score/{model}')
async def chat_score(
    model: str,
    body: ScoreChatPayload | ChatCompletionCreate,
    context=UseContext(),
):
    log_request('LHS', body, model_alias=model)

    context.models = context.models.features_only('messages')
    context.misc['raw_amlchatscore'] = body

    if body.get('messages'):
        openai_body = body
        openai_body['model'] = model
    else:
        openai_body = amlchatscore_to_openai(body, model)

    model_response = await context.invoke('completion', **openai_body)

    if choices := model_response.choices:
        output = {'output': choices[0].message.content}
    else:
        output = {}

    log_response('LHS', output)
    return ORJSONResponse(output, headers=model_response._response_headers)


# TODO: DRY
@app.post('/prompt/score/{model}')
async def prompt_score(
    model: str,
    body: ScorePromptPayload,
    context=UseContext(),
):
    log_request('LHS', body, model_alias=model)

    context.models = context.models.features_only('messages')
    context.misc['raw_amlpromptscore'] = body

    openai_body = amlpromptscore_to_openai(body, model)
    model_response = await context.invoke('completion', **openai_body)

    if choices := model_response.choices:
        output = {'output': choices[0].message.content}
    else:
        output = {}
    
    log_response('LHS', output)
    return ORJSONResponse(output, headers=model_response._response_headers)


# TODO: DRY
@app.post('/embedding/score/{model}')
async def embedding_score(
    model: str,
    body: ScoreEmbeddingPayload,
    context=UseContext(),
):
    log_request('LHS', body, model_alias=model)

    #context.models = context.models.features_only('embeddings')
    context.misc['raw_amlembeddingscore'] = body

    openai_body = amlembeddingscore_to_openai(body, model)
    model_response = await context.invoke('embedding', **openai_body)

    if data := model_response.data:
        output = data[0].embedding
    else:
        output = []

    log_response('LHS', output)
    return ORJSONResponse(output, headers=model_response._response_headers)
