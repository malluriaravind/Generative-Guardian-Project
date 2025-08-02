import logging
import time

from typing import *
from datetime import datetime
from fastapi import Depends, Request

from trussed.models.apikey import Apikey
from trussed.utils.cache import lru_cache, Bypass
from trussed.utils.logging.ctx import ContextualLogger

from core.errors import InvalidApiKeyError, ExpiredApiKeyError, TooManyRequestsError, UnbudgetedApiKeyError
from core.policies.get import with_policies
from core.providers import Context
from core.state import State


log = logging.getLogger(__name__)
GetApikey = Callable[[], Apikey]


@lru_cache(maxsize=1024)
def logging_state(get: GetApikey, cache_key: Hashable):
    '''
    The get() getter is used to bypass caching.
    '''
    apikey = get()
    state = ContextualLogger.newState()

    for params in apikey.log_params or ():
        state.levels[params['logger']] = params['level']

    return state


# fmt: off
def UseAppKey() -> Apikey:
    async def apikeygetter(request: Request):
        if not (authorization := request.headers.get('Authorization')):
            raise InvalidApiKeyError("You didn't provide an API key")

        scheme, token = authorization.partition(' ')[::2]
        now = datetime.utcnow()

        if scheme != 'Bearer':
            raise InvalidApiKeyError('Unknown authorization scheme')

        if not (apikey := await Apikey.get_by_key(token)):
            raise InvalidApiKeyError()

        if apikey.log_enable or apikey.log_reqres:
            if apikey.log_until and apikey.log_until > now:
                state = logging_state(Bypass(apikey), (apikey.id, apikey.updated_at))
                ContextualLogger.setState(state)

        if apikey.expires_at and apikey.expires_at < now:
            raise ExpiredApiKeyError()

        if apikey.unbudgeted_until and apikey.unbudgeted_until > now:
            raise UnbudgetedApiKeyError(delta=apikey.unbudgeted_until - now)

        if rate := apikey.rate():
            if delay := rate_throttle(apikey.api_key_hash, rate):
                raise TooManyRequestsError(
                    rate_requests=apikey.rate_requests,
                    rate_period=apikey.rate_period,
                    retry_after=delay,
                )

        return apikey

    return Depends(apikeygetter)
# fmt: on


def UseContext():
    async def contextgetter(request: Request, apikey=UseAppKey()):
        context = await with_policies(await Context.from_apikey(apikey))

        if (state := State.get()) is not None:
            state.context = context

        return context

    return Depends(contextgetter)


def rate_throttle(key, rate, d={}):
    """
    Calculate the time to sleep in order to comply with the rate limit for the given key.
    Single-process mode only. Use shared store like LMDB for multiprocess mode.

    Args:
        key: The identifier for the rate limit.
        rate: The time interval for the rate limit.
        d: A dictionary to store the last access time for each key.
    """
    last = d.get(key, 0)
    current = time.time()
    elapsed = current - last

    if rate > elapsed > 0:
        return rate - elapsed

    d[key] = current
    return 0
