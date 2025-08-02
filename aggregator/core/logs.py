import logging
import httpx
import orjson
import inspect

from typing import Protocol

from trussed.utils.asgi import reqvars
from trussed.utils.cache import lru_cache
#from trussed.models.logrecord import Side



logger = logging.getLogger(__name__)
logreq = logging.getLogger('tc.reqres')


Side = str

def log_request(side: Side, payload: dict | str | bytes, **extra):
    extra['side'] = side
    extra['raw_request'] = payload
    logreq.debug('%s request', side, extra=extra)


def log_response(side: Side, payload: dict | str | bytes, **extra):
    extra['side'] = side
    extra['raw_response'] = payload
    logreq.debug('%s response', side, extra=extra)


class WithName(Protocol):
    name: str


@lru_cache
def get_policy_names(*args: WithName):
    return tuple(i.name for i in args)


@lru_cache
def StateClass():
    from core.state import State
    return State


class AddContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord):
        try:
            State = StateClass()
        except ImportError:
            return True

        if (vars := reqvars.get()) is not None:
            record.__dict__.update(vars)

        if (state := State.get()) is not None:
            record.__dict__.update(state.logvars)

            if (context := state.context) is not None:
                record.key_id = context.apikey.id

                if (hooks := context.hooks) is not None:
                    record.policies = get_policy_names(*hooks.instances)

                if context.provider is not None:
                    record.llm_id = context.provider.llm.id
                    record.provider = context.provider.name
                    record.scopes = context.apikey.scopes

                    if context.modelinfo is not None:
                        record.model = context.modelinfo.name
                        record.model_alias = context.modelinfo.alias
        return True


class SpyHttpxMixin:
    @lru_cache
    def spy_target(self) -> str | None:
        """
        This method is used to detect if the request is a completion request
        (e.g. if the request is being made from litellm.acompletion)
        """
        for i in inspect.stack():
            if 'completion' in i.function:
                return 'completion'

    def spy_request(self, request: httpx.Request):
        if self.spy_target() is None:
            return

        if isinstance(request.stream, httpx.ByteStream):
            log_request('RHS', request.stream._stream)

    def spy_response(self, response: httpx.Response):
        if self.spy_target() is None:
            return

        if response.headers.get('Content-Type', '').startswith('application/json'):
            is_error = response.status_code != 200

            try:
                body = orjson.loads(response.content)
            except ValueError:
                body = response.content.decode(errors='ignore')
                is_error = True

            log_response(
                'RHS',
                body,
                raw_response_code=response.status_code,
                raw_response_is_error=is_error,
            )


class SpyAsyncClient(httpx.AsyncClient, SpyHttpxMixin):
    async def send(self, request: httpx.Request, *args, **kwargs):
        request = self.spy_request(request) or request
        response = await super().send(request, *args, **kwargs)
        return self.spy_response(response) or response


class SpyClient(httpx.Client, SpyHttpxMixin):
    def send(self, request: httpx.Request, *args, **kwargs):
        request = self.spy_request(request) or request
        response = super().send(request, *args, **kwargs)
        return self.spy_response(response) or response


def patch_llm_logging():
    httpx.AsyncClient = SpyAsyncClient
    httpx.Client = SpyClient

