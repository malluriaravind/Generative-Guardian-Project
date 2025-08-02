from dataclasses import dataclass, field
import logging
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import RedirectResponse, Response
from onelogin.saml2.auth import OneLogin_Saml2_Auth, OneLogin_Saml2_Settings

from control_panel.deps.auth import jwt_response
from trussed.models.user import *
from trussed.models.cfg import Cfg
from control_panel.config import env
from control_panel import config
from trussed.utils.tokengenerator import tokengetter

log = logging.getLogger(__name__)
router = APIRouter(prefix='/sso', tags=['sso'])
generate_password = tokengetter(length=12)

ERRORS = {
    401: HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail='User not authentificated'
    )
}


@dataclass
class UserData:
    first_name: str
    last_name: str
    email: str
    roles: list[str] = field(default_factory=list)


async def get_rbac_roles() -> dict[str, list[str]] | list[str]:
    cfg = await Cfg.find_one({'name': 'SSO_ROLE_MAPPINGS'})
    role_mappings = cfg.extra if cfg else []
    return role_mappings or env.list('SSO_DEFAULT_ROLES', [])


def get_user_rbac_roles(user_attributes, role_mappings) -> set[str]:
    if isinstance(role_mappings, list):
        return role_mappings
    if not (
        user_roles := {*user_attributes.get(env.str('SSO_ROLE_FIELD_NAME', ''), [])}
    ):
        return []

    intercepted_roles = user_roles & set(role_mappings.keys())
    if not intercepted_roles:
        return []

    return {
        role
        for role_group in intercepted_roles
        for role in role_mappings.get(role_group, ())
    }


def is_role_authentificated(user_attributes):
    if not env.bool('SSO_ROLE_ENABLED'):
        return True

    if not (
        user_roles := {*user_attributes.get(env.str('SSO_ROLE_FIELD_NAME', ''), [])}
    ):
        return False

    if not (role_values := {*env.list('SSO_ROLE_VALUES', [])}):
        return True

    match env.str('SSO_ROLE_MODE', None):
        case 'one_of':
            return user_roles.intersection(role_values)
        case 'all_of':
            return user_roles.issuperset(role_values)
        case _:
            return False


def is_user_allowed(user, user_attributes):
    flags: list[bool] = []

    if env.bool('SSO_ROLE_ENABLED'):
        flags.append(is_role_authentificated(user_attributes))

    if env.bool('SSO_ACCOUNT_ENABLED'):
        flags.append(bool(user))

    return any(flags or [True])


def get_user_data(data, nameid) -> UserData:
    email_key = env.str('SSO_EMAIL_FIELD_NAME')
    first_name_key = env.str('SSO_FIRST_NAME_FIELD_NAME')
    last_name_key = env.str('SSO_LAST_NAME_FIELD_NAME')
    if email_key not in data:
        log.error(
            'email not found under "%s" key in request data: %s. Using nameid instead',
            email_key,
            data,
        )
        if not nameid:
            raise HTTPException(
                status_code=400,
                detail={
                    'error': 'email_not_found',
                    'reason': f'email not found under {email_key} key',
                },
            )
    email = data.get(email_key, nameid)
    first_name = data.get(first_name_key)
    last_name = data.get(last_name_key)
    if isinstance(email, list):
        email = next(iter(email), None)
    if isinstance(first_name, list):
        first_name = next(iter(first_name), None)
    if isinstance(last_name, list):
        last_name = next(iter(last_name), None)
    return UserData(first_name, last_name, email)


async def create_user(data: UserData) -> User:
    user = User(
        first_name=data.first_name or 'sso-user',
        last_name=data.last_name or '',
        email=data.email,
        password_hash=User.new_password_hash(generate_password()),
        is_root=False,
        roles=data.roles,
    )
    await user.insert()
    return user


def init_saml_auth(req):
    domain = env.str('DOMAIN')
    protocol = 'https' if env.bool('IS_HTTPS') else 'http'
    base_url = f'{protocol}://{domain}'
    settings = OneLogin_Saml2_Settings(
        {
            'strict': True,
            'debug': False,
            'sp': {
                'entityId': f'{base_url}/api/sso/metadata/',
                'assertionConsumerService': {
                    'url': f'{base_url}/api/sso/acs/',
                    'binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                },
                'singleLogoutService': {
                    'url': f'{base_url}/api/sso/sls/',
                    'binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                },
                'NameIDFormat': 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
                'x509cert': '',
                'privateKey': '',
            },
            'idp': {
                'entityId': env.str('ENTITY_ID'),
                'singleSignOnService': {
                    'url': env.str('SSO_URL'),
                    'binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
                },
                'x509cert': env.str('SSO_CERTIFICATE'),
            },
            'security': {
                'requestedAuthnContext': [
                    'urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified',
                ],
                'requestedAuthnContextComparison': 'exact',
            },
        },
    )
    auth = OneLogin_Saml2_Auth(req, old_settings=settings)
    return auth


async def prepare_request(request: Request):
    return {
        'https': 'on' if env.bool('IS_HTTPS') else 'off',
        'http_host': env.str('DOMAIN'),
        'script_name': request.url.path,
        # 'server_port': server_port,
        'get_data': request.query_params,
        'post_data': await request.form(),
        'lowercase_urlencoding': True,
        'query_string': request.url.query.encode('utf-8'),
    }


@router.get('/metadata/')
async def metadata(request: Request):
    saml_settings = init_saml_auth(await prepare_request(request)).get_settings()
    metadata = saml_settings.get_sp_metadata()
    errors = saml_settings.validate_metadata(metadata)
    if len(errors) > 0:
        error_message = ', '.join(errors)
        log.error('Metadata error: %s', error_message)
        raise HTTPException(status_code=500, detail=error_message)

    return Response(content=metadata, media_type='application/xml')


@router.get('/')
async def sso(request: Request):
    req = await prepare_request(request)
    sso_auth = init_saml_auth(req)
    return RedirectResponse(sso_auth.login())


@router.post('/acs/')
async def acs(request: Request):
    if not env.str('DOMAIN'):
        log.error('Domain is not set')
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                'error': 'doamin_not_set',
                'reason': 'Domain configuration is not set',
            },
        )
    req = await prepare_request(request)
    auth = init_saml_auth(req)
    auth.process_response()
    errors = auth.get_errors()
    try:
        if len(errors) > 0:
            error_message = ', '.join(errors)
            reason = auth.get_last_error_reason()
            log.error(
                'Bad request: error: %s, reason: %s, request: %s',
                error_message,
                reason,
                req,
            )
            raise HTTPException(
                status_code=400,
                detail={
                    'error': error_message,
                    'reason': reason,
                },
            )
        if not auth.is_authenticated():
            raise ERRORS[401]
        user_attributes = {
            **auth.get_friendlyname_attributes(),
            **auth.get_attributes(),
        }
        user_data = get_user_data(user_attributes, auth.get_nameid())
        user = await User.find_one(User.email == user_data.email)
        rbac_roles = await get_rbac_roles()
        user_rbac_roles = get_user_rbac_roles(user_attributes, rbac_roles) or env.list(
            'SSO_DEFAULT_ROLES', []
        )
        
        if not user_rbac_roles and not is_user_allowed(user, user_attributes):
            raise ERRORS[401]
        if not user:
            user_data.roles = user_rbac_roles
            user = await create_user(user_data)
    except HTTPException as e:
        return RedirectResponse(
            f'/?error={e.detail}',
            status_code=status.HTTP_303_SEE_OTHER,
        )
    response = RedirectResponse('/', status_code=status.HTTP_303_SEE_OTHER)
    jwt = JWT.new(user.id, minutes=config.JWT_TTL_MINUTES_LONG)
    await User.jwt_login(jwt, config.JWT_MAX_PER_USER)
    jwt_response(response, jwt)
    return response


@router.get('/sls/')
async def sls(request: Request):
    req = await prepare_request(request)
    auth = init_saml_auth(req)
    return RedirectResponse(auth.logout())
