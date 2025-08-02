import logging

from contextvars import ContextVar
from pytz import common_timezones_set
from fastapi.applications import BaseHTTPMiddleware


log = logging.getLogger(__name__)


class ContextTimezone(BaseHTTPMiddleware):
    def __init__(self, app, to: ContextVar[str]):
        super().__init__(app)
        self.var = to

    async def dispatch(self, request, call_next):
        if tz := request.headers.get('X-Timezone'):
            if tz in common_timezones_set:
                self.var.set(tz)
            else:
                log.debug('Uncommon timezone provided: %s', tz[:20])

        response = await call_next(request)
        return response
