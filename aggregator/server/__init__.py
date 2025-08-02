import logging
import litellm

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from trussed.utils.asgi import EntryAsgiContext, RequestVars
from core.state import State


log = logging.getLogger(__name__)
litellm.drop_params = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        import server.generic
        import server.azureml
        import db

        await db.init()

        app.mount('/generic', server.generic.app)
        app.mount('/azureml', server.azureml.app)
    except Exception as e:
        log.error(e)
        raise e

    yield


def before(vars: RequestVars):
    State.set(State({}))


def after(vars: RequestVars):
    if (state := State.get()) is None:
        return

    if (context := state.context) is not None:
        provider_time_ms = context.response_time.total_elapsed * 1000
        vars['processing_time_ms'] = vars['request_time_ms'] - provider_time_ms
        state.logvars['provider_time_ms'] = provider_time_ms


class Application(FastAPI):
    def build_middleware_stack(self):
        app = super().build_middleware_stack()
        return EntryAsgiContext(app, before, after)


app = Application(
    lifespan=lifespan,
    title='Trussed AI Controller',
    openapi_url='/openapi.json',
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.middleware('http')
async def middleware(request: Request, call_next):
    if (state := State.get()) is not None:
        state.logvars['dev_id'] = request.headers.get('X-Dev-Id', None)

    return await call_next(request)

