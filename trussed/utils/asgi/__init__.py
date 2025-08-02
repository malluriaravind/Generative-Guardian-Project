import time
import functools

from typing import TypedDict, Callable, NotRequired, cast
from contextvars import ContextVar

from .types import HTTPScope
from ..tokengenerator import tokengetter


class RequestVars(TypedDict):
    http_method: str
    http_path: str
    http_query: str
    http_full_path: str
    http_addr: NotRequired[str]
    http_status_code: NotRequired[int]

    request_start: float
    request_id: str
    request_time_ms: NotRequired[float]
    request_overhead_ms: NotRequired[float]


new_request_id = tokengetter(length=12)
reqvars = ContextVar[RequestVars | None]('reqvars', default=None)


def EntryAsgiContext[T: RequestVars](
    app,
    before: Callable[[T], None] = lambda vars: None,
    after: Callable[[T], None] = lambda vars: None,
    varsclass: type[T] = RequestVars,
):
    @functools.wraps(app)
    async def wrapper(_scope, receive, send):
        if _scope['type'] not in ('http', 'websocket'):
            return await app(_scope, receive, send)

        scope: HTTPScope = cast(HTTPScope, _scope)

        vars = varsclass(
            request_start=time.time(),
            request_id=new_request_id(),
            http_method=scope['method'],
            http_path=scope['path'],
            http_query=(q := scope['query_string'].decode()),
            http_full_path=scope['path'] + '?' + q,
        )

        if (addr := scope.get('client')) is not None:
            vars['http_addr'] = addr[0]

        reqvars.set(vars)
        before(vars)

        async def wrapped_send(event):
            if event['type'] == 'http.response.start':
                vars['http_status_code'] = event['status']
                vars['request_time_ms'] = (time.time() - vars['request_start']) * 1000

            after(vars)
            await send(event)

        try:
            await app(scope, receive, wrapped_send)
        except Exception:
            vars.setdefault('request_time_ms', (time.time() - vars['request_start']) * 1000)
            vars['http_status_code'] = 500
            after(vars)
            raise

    return wrapper


