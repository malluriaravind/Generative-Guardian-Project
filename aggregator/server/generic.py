import logging

from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.responses import HTMLResponse, ORJSONResponse as JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel, ValidationError
from fastapi.exceptions import RequestValidationError
from typing import *

from litellm.utils import CustomStreamWrapper
from litellm.utils import ModelResponse
from litellm.exceptions import APIError

from trussed.typedef.openai import EmbeddingCreate, ChatCompletionCreate
from trussed.utils.oas import get_rapi_html

from core.logs import log_request, log_response
from core.errors import ApiException, InstantApiResponse
from server.deps.access import UseContext

from core.policies.get import with_policies

from core.providers import Context, Provider, TrackingStream
from core.providers.openai import LiteLlmOpenAiProvider
from core.providers.azure import LiteLlmAzureProvider
from core.providers.bedrock import LiteLlmBedrockProvider
from core.providers.gemini import LiteLlmGeminiProvider
from core.providers.mistral import LiteLlmMistralProvider
from core.providers.anthropic import LiteLlmAnthropicProvider
from core.providers.openaicompatible import LiteLlmOpenAiCustomProvider
from core.providers.amlscore import AzureMLChatScoreProvider


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


@app.exception_handler(Exception)
async def handle_exception(request: Request, e: Exception):
    log.exception("Unhandled exception: %r", e)
    content = {
        'error': {
            'message': 'Something went wrong on Trussed Controller side',  # repr(e),
            'type': 'server_error',
        }
    }
    log_response('LHS', content)
    return JSONResponse(content, 500)


@app.exception_handler(ApiException)
async def handle_api_exception(request: Request, e: ApiException):
    log.error("Request rejected: %s", e)
    log_response('LHS', e.response_body)
    return JSONResponse(e.response_body, e.http_code, e.response_headers)


@app.exception_handler(InstantApiResponse)
async def handle_api_instant_response(request: Request, e: InstantApiResponse):
    log.info(f"InstantApiResponse: Returning response with status {e.http_code}")
    log_response('LHS', e.response_body)
    return JSONResponse(e.response_body, e.http_code, e.response_headers)


@app.exception_handler(ValidationError)
@app.exception_handler(RequestValidationError)
def handle_validation_exception(request: Request, e: RequestValidationError):
    log.exception("Validation error: %r", e)

    if isinstance(e, RequestValidationError):
        # FastAPI always prepends 'body' to the location, remove it
        loc_slice = slice(1, None, None)
    else:
        loc_slice = slice(None, None, None)

    error = next(iter(e.errors()))
    path = '.'.join(map(str, error['loc'][loc_slice]))
    message = error.get('ctx', {}).get('reason') or error['msg'].capitalize()

    content = {
        'error': {
            'message': f"{message} - '{path}'",
            'type': 'invalid_request_error',
        }
    }

    log_response('LHS', content)
    return JSONResponse(content, status_code=422)


@app.get('/reference')
async def spec_reference_html(req: Request) -> HTMLResponse:
    return HTMLResponse(get_rapi_html('openapi.json'))


async def openai_sse_stream(stream: AsyncIterator[ModelResponse]):
    log.debug("Starting OpenAI SSE stream")

    async for i in stream:
        log.debug('Streaming data: %s', i)
        yield dict(data=i.model_dump_json())

    log.debug("OpenAI SSE stream completed")
    yield dict(data='[DONE]')


@app.post('/chat/completions')
async def completions(body: ChatCompletionCreate, context: Context = UseContext()):
    log_request('LHS', body, model_alias=body.get('model'))

    if body.get('stream'):
        context.models = context.models.features_only('messages', 'stream')
    else:
        context.models = context.models.features_only('messages')

    object = await context.invoke('completion', **body)

    if isinstance(object, TrackingStream):
        log.info('Returning TrackingStream response for /chat/completions')
        return EventSourceResponse(openai_sse_stream(object.stream()))

    if isinstance(object, BaseModel):
        log_response('LHS', object.model_dump())

    return object


@app.post('/embeddings')
async def embeddings(body: EmbeddingCreate, context: Context = UseContext()):
    log_request('LHS', body, model_alias=body.get('model'))

    object = await context.invoke('embedding', **body)

    if isinstance(object, BaseModel):
        log_response('LHS', object.model_dump())

    return object

