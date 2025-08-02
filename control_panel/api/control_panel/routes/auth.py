import logging
import asyncio
import aiosmtplib
import string
import secrets

from email.message import EmailMessage

from control_panel.errors import UserNotFoundError
from fastapi import APIRouter, Response, HTTPException
from pymongo.errors import DuplicateKeyError
from beanie import PydanticObjectId

from control_panel import config
from control_panel.deps.auth import Auth, GetAuth, jwt_response
from control_panel.config import env
from control_panel.errors import InvalidLoginError, TooManyAuthTokensError
from trussed.models.user import *
from trussed.models.cfg import Cfg
from control_panel.routes.cfg import send_test_email
from trussed.utils.tokengenerator import tokengetter  # Import SMTP functions


log = logging.getLogger(__name__)
router = APIRouter(tags=['Authentication'])
generate_password = tokengetter(length=12)


class TokenReturn(TypedDict):
    token: str


@router.post('/signup')
async def signup(body: UserCreateDto, response: Response):
    user = User(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        password_hash=User.new_password_hash(body.password),
    )
    await user.insert()
    jwt = JWT.new(user.id, minutes=config.JWT_TTL_MINUTES)
    await User.jwt_login(jwt, config.JWT_MAX_PER_USER)
    return jwt_response(response, jwt)


@router.post('/login')
async def login(body: UserLoginDto, response: Response) -> TokenReturn:
    user = await User.find_one(User.email == body.email)

    if not user:
        log.warning(f'Login failed for email: {body.email} - User not found')
        raise InvalidLoginError('Invalid email', field='email')

    if not user.check_password(body.password):
        log.warning(f'Login failed for email: {body.email} - Incorrect password')
        raise InvalidLoginError('Invalid password', field='password')

    if body.rememberme:
        jwt = JWT.new(user.id, minutes=config.JWT_TTL_MINUTES_LONG)
        log.info(f'Long-lived JWT issued for user ID: {user.id}')
    else:
        jwt = JWT.new(user.id, minutes=config.JWT_TTL_MINUTES)
        log.info(f'JWT issued for user ID: {user.id}')

    await User.jwt_login(jwt, config.JWT_MAX_PER_USER)
    log.info(f'User ID: {user.id} logged in with JWT: {jwt.jti}')
    return jwt_response(response, jwt)


@router.post('/logout')
async def logout(auth: Auth = GetAuth(required=False)):
    if auth:
        log.info(f'Logout request received for JWT: {auth.jwt}')
        result = await User.jwt_logout(auth.jwt)
        log.info(
            f'JWT: {auth.jwt} logged out successfully. Modified count: {result.modified_count}'
        )
        return result.modified_count
    log.info('Logout request received without authentication')
    raise HTTPException(status_code=401, detail='Authentication required')


@router.post('/logoutall')
async def logoutall(auth: Auth = GetAuth(required=False)):
    if auth:
        result = await User.jwt_logout_all(auth.jwt)
        log.info(
            f'All tokens for user ID: {auth.user.id} have been logged out. Modified count: {result.modified_count}'
        )
        return result.modified_count


@router.post('/tokens/issue')
async def issue_token(days: float = 7, auth: Auth = GetAuth()) -> TokenReturn:
    log.info(
        f'Issuing new token for user ID: {auth.user.id} with duration: {days} days'
    )
    if len(auth.user.tokens) >= config.JWT_MAX_PER_USER:
        log.warning(f'User ID: {auth.user.id} has reached the maximum number of tokens')
        raise TooManyAuthTokensError()

    jwt = JWT.new(auth.user.id, minutes=60 * 24 * days)
    token = jwt.encode(config.JWT_SECRET)
    await User.jwt_login(jwt, config.JWT_MAX_PER_USER)
    log.info(f'New token issued for user ID: {auth.user.id}, JWT: {jwt.jti}')
    return {'token': token}


@router.get('/tokens/fetch')
async def issued_tokens(auth: Auth = GetAuth()) -> list[IssuedToken]:
    log.info(f'Fetching issued tokens for user ID: {auth.user.id}')
    tokens = [IssuedToken.from_jti(i, i == auth.jwt.jti) for i in auth.user.tokens]
    log.debug(f'Issued tokens for user ID: {auth.user.id}: {tokens}')
    return tokens


@router.post('/tokens/revoke')
async def revoke_token(jti: PydanticObjectId, auth: Auth = GetAuth()) -> int:
    result = await User.jti_logout(jti, auth.user.id)
    log.info(
        f'Token JTI: {jti} has been revoked. Modified count: {result.modified_count}'
    )
    return result.modified_count


@router.post('/reset-password')
async def reset_password(body: UserEmailRequest):
    log.info(f'Password reset requested for email: {body.email}')
    user = await User.find_one(User.email == body.email)

    if not user:
        log.warning(f'Password reset attempted for non-existent email: {body.email}')
        raise UserNotFoundError

    temp_password = generate_password()
    user.set_password(temp_password)
    await user.save()

    await send_temporary_password_email(user.email, temp_password)
    log.info(f'Temporary password email sent to: {user.email}')

    return {'message': 'A temporary password has been sent to your email.'}


async def send_temporary_password_email(to_email: str, temp_password: str):
    message = EmailMessage()
    message['From'] = env.str('SMTP_FROM')
    message['To'] = to_email
    message['Subject'] = 'Trussed Password Reset'

    message.set_content(f"""
    Hello,

    You have requested to reset your password. Please use the following temporary password to log in:

    Temporary Password: {temp_password} for Email: {to_email}

    Please log in using this temporary password and change your password immediately after logging in.

    If you did not request a password reset, please contact support immediately.

    Best regards,
    Your Support Team
    """)

    try:
        await aiosmtplib.send(
            message,
            hostname=env.str('SMTP_HOST'),
            port=env.int('SMTP_PORT'),
            username=env.str('SMTP_USER'),
            password=env.str('SMTP_PASSWORD'),
            start_tls=True,
        )
        log.info(f'Welcome email has been sent to {to_email}')
    except Exception as e:
        log.error(f'Failed to send welcome email to {to_email}: {e}')
        raise
