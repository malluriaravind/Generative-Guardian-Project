import logging

from typing import Callable, ClassVar, Any
from collections.abc import Collection
from dataclasses import dataclass, field
from fastapi import APIRouter, Depends, Request, Response
from fastapi.routing import APIRoute


from control_panel import config
from trussed.errors import ApiException, AuthorizationError, ForbiddenError
from trussed.models import AppDocument
from trussed.models.user import User, JWT, JWTError
from trussed.models.rbac import Role, RBAC


log = logging.getLogger(__name__)


@dataclass(slots=True)
class Auth:
    user: User
    jwt: JWT
    rbac: RBAC = field(default_factory=RBAC)

    def setup_request(self, request: Request, check_rbac=True):
        if self.user.is_root:
            return

        resource_scopes = AppDocument.set_scoped_context(self.rbac.scopes)

        if not isinstance(route := request.scope.get('route'), APIRoute):
            raise ApiException(message='Could not determine route instance')

        # Check if the route has access control defined
        if ac := AcAPIRouter.ac_routes.get(route.operation_id):
            permissions = self.rbac.mapping.get(ac.namespace) or set()

            if missing := ac.crud.difference(permissions):
                if check_rbac:
                    raise ForbiddenError(
                        f'You do not have {", ".join(missing)} permission(s) on {ac.namespace}'
                    )
    
            if 'Global' in permissions and ac.allow_global_permission_for:
                resource_scopes.disable_for = ac.allow_global_permission_for


def GetJWT(required=True):
    def jwtgetter(request: Request):
        token: str = ''

        if authorization := request.headers.get('Authorization'):
            scheme, token = authorization.partition(' ')[::2]

            if scheme and scheme != 'Bearer':
                raise AuthorizationError('Unknown authorization scheme')

        try:
            return JWT.decode(token, config.JWT_SECRET)
        except (JWTError, ValueError):
            try:
                token = request.cookies.get('token', '')
                return JWT.decode(token, config.JWT_SECRET)
            except (JWTError, ValueError):
                if required:
                    raise AuthorizationError('You must be logged in') from None

    return Depends(jwtgetter)


def GetAuth(required=True, check_rbac=True):
    async def usergetter(request: Request, jwt: JWT = GetJWT(required)):
        log.info(jwt)

        if not jwt:
            if required:
                raise AuthorizationError('Authorization failed')

            return

        user: User | None = None

        if candidate := await User.find_one(User.id == jwt.sub):
            if jwt.jti in candidate.tokens:
                user = candidate

        if user:
            rbac = await RBAC.from_user(user)
            auth = Auth(user, jwt, rbac=rbac)
            auth.setup_request(request, check_rbac=check_rbac)
            request.state.auth = auth
            return auth

        if required:
            raise AuthorizationError('You are no longer logged in')

    return Depends(usergetter)


@dataclass(slots=True)
class AccessControlRoute:
    namespace: str
    crud: set[str]
    allow_global_permission_for: set[type[AppDocument]]


class AcAPIRouter(APIRouter):
    ac_routes: ClassVar[dict[str | None, AccessControlRoute]] = {}
    ac_namespace: str | None = None
    ac_crud: set[str] | None = None
    ac_allow_global_permission_for: Collection[type[AppDocument]] = ()

    @classmethod
    def get_consolidated_routes(cls) -> dict[str, AccessControlRoute]:
        """
        Returns a consolidated view of all access control routes.
        """
        groups: dict[str, AccessControlRoute] = {}
    
        for i in AcAPIRouter.ac_routes.values():
            if (ac := groups.get(i.namespace)) is not None:
                ac.crud.update(i.crud)
                ac.allow_global_permission_for.update(i.allow_global_permission_for)
            else:
                groups[i.namespace] = AccessControlRoute(
                    namespace=i.namespace,
                    crud={*i.crud},
                    allow_global_permission_for={*i.allow_global_permission_for},
                )

        return groups

    def add_api_route( # type: ignore[override]
        self,
        path: str,
        endpoint: Callable,
        *,
        methods: list[str] | None = None,
        operation_id: str | None = None,
        openapi_extra: dict[str, Any] | None = None,
        **kwargs,
    ) -> None:
        assert self.ac_namespace or self.prefix, (
            'You must set the access_control_namespace or prefix attribute on the router'
        )

        if not operation_id:
            operation_id = self.prefix + path
        
        if openapi_extra is None:
            openapi_extra = {}
        
        crud = set(self.ac_crud or ())

        if not openapi_extra.get('x-crud'):
            openapi_extra['x-crud'] = crud

            if path.endswith('/create'):
                crud.add('Create')
            elif path.endswith('/delete'):
                crud.add('Delete')
            elif methods and 'POST' in methods:
                crud.add('Update')
            elif methods and 'GET' in methods:
                crud.add('Read')
        else:
            crud.update(openapi_extra['x-crud'])

        self.ac_routes[operation_id] = AccessControlRoute(
            namespace=self.ac_namespace or f'{self.prefix}/',
            crud=crud,
            allow_global_permission_for={*self.ac_allow_global_permission_for},
        )

        super().add_api_route(
            path,
            endpoint,
            methods=methods,
            operation_id=operation_id,
            openapi_extra=openapi_extra,
            **kwargs,
        )


def jwt_response(response: Response, jwt: JWT):
    token = jwt.encode(config.JWT_SECRET)

    response.set_cookie(
        key='token',
        value=token,
        path='/',
        expires=jwt.exp,
        samesite='strict',
    )
    response.headers['Authorization'] = f'Bearer {token}'

    return {'token': token}
