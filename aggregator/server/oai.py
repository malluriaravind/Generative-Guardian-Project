import logging
import openai

# import openai.error
import backoff
import core
import core.oai
import server.errors

from openai import AsyncOpenAI, APIStatusError
from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import *

from core.errors import ApiException
from server.deps.access import UseKey


log = logger = logging.getLogger(__name__)
logging.getLogger('backoff').addHandler(logging.StreamHandler())

app = FastAPI(exception_handlers=server.errors.exception_handlers)
oai = AsyncOpenAI(api_key='')


@app.middleware("http")
async def set_context_api_key(request: Request, call_next):
    log.info(f"Incoming request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        log.info(f"Response status: {response.status_code} for {request.method} {request.url}")
        return response
    except Exception as e:
        log.exception("Exception occurred in set_context_api_key middleware")
        raise e


@app.exception_handler(APIStatusError)
async def handle_openai_error(request: Request, e: APIStatusError):
    log.error(f"OpenAI APIStatusError for {request.method} {request.url}: {e}")
    return JSONResponse(e.response.json(), e.status_code)


@app.post('/v1/completions')
async def completions(body: dict, context=UseKey('OpenAI')):
    log.debug(f"/v1/completions called with body: {body}")
    try:
        object, apiresponse = await context.completion_create(**body)
    except ApiException as api_exc:
        log.error(f"APIException in /v1/completions: {api_exc}")
        raise api_exc
    except Exception as exc:
        log.exception(f"Unexpected error in /v1/completions: {exc}")
        raise ApiException("An unexpected error occurred.") from exc

    if isinstance(object, core.oai.TrackingStream):
        log.info("Returning TrackingStream response for /v1/completions")
        return EventSourceResponse(object.generator())

    log.info("Returning standard completion response for /v1/completions")
    return object


@app.post('/v1/chat/completions')
async def chat_completions(body: dict, context=UseKey('OpenAI')):
    log.debug(f"/v1/chat/completions called with body: {body}")
    try:
        object, apiresponse = await context.chat_completion_create(**body)
    except ApiException as api_exc:
        log.error(f"APIException in /v1/chat/completions: {api_exc}")
        raise api_exc
    except Exception as exc:
        log.exception(f"Unexpected error in /v1/chat/completions: {exc}")
        raise ApiException("An unexpected error occurred.") from exc

    if isinstance(object, core.oai.TrackingStream):
        log.info("Returning TrackingStream response for /v1/chat/completions")
        return EventSourceResponse(object.generator())

    log.info("Returning standard chat completion response for /v1/chat/completions")
    return object
