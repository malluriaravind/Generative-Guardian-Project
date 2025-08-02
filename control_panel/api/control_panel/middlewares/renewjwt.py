import logging

from fastapi import Request, Response
from fastapi.applications import BaseHTTPMiddleware
from datetime import datetime, timezone

from control_panel import config
from trussed.models.user import JWT, User
from control_panel.deps.auth import Auth, jwt_response


log = logging.getLogger(__name__)


class JWTRenewal(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        auth: Auth

        if response.headers.get('Authorization') is not None:
            return response

        if auth := getattr(request.state, 'auth', None):
            if (auth.jwt.exp - datetime.now(timezone.utc)).seconds < 60 * 5:
                log.info(f'Renew JWT: {auth.jwt}')

                jwt = JWT.new(auth.jwt.sub, config.JWT_TTL_MINUTES)
                await User.jwt_login(jwt, config.JWT_MAX_PER_USER)

                jwt_response(response, jwt)

        return response
