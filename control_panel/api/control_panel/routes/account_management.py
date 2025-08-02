import logging

from typing import Iterable
from fastapi import APIRouter, Request
from control_panel import config
from pymongo.errors import DuplicateKeyError
from control_panel.deps.auth import Auth, GetAuth, AcAPIRouter

from trussed.errors import ForbiddenError, InvalidLoginError, AccountDuplicationError
from trussed.models.rbac import Role
from trussed.models.user import (
    UserCreateDto,
    User,
    UserResponseDto,
    UserEmailRequest,
    UserUpdateDto,
    AccountChangePasswordRequest,
)


# Initialize the logger for this module
logger = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/accounts', tags=['Accounts'])
router.ac_allow_global_permission_for = {User}


async def roles_validate(roles: list[str], auth: Auth) -> list[str]:
    valid_roles: list[str] = []

    async for role in Role.find_many({'name': {'$in': roles}}):
        auth.rbac.check_for_permissions(role.permissions)
        auth.rbac.check_for_scopes(role.assigned_scopes)
        valid_roles.append(role.name)

    return valid_roles


@router.post('/create')
async def create(body: UserCreateDto, auth: Auth = GetAuth()):
    logger.info(f'Create user request received from {auth.user.email}')

    if not auth.user.is_root and body.is_root:
        logger.error(f'Unauthorized attempt to create root user by {auth.user.email}')
        raise ForbiddenError('You are not authorized to create a root user.')

    user = User(
        ownership_id=auth.user.ownership_id,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        password_hash=User.new_password_hash(body.password),
        created_by=auth.user.email,
        is_root=body.is_root,
        scopes=body.scopes,
        roles=await roles_validate(body.roles, auth),
    )

    try:
        await user.insert()
        logger.info(f'User {body.email} created successfully by {auth.user.email}')
        return {'success': True}
    except DuplicateKeyError as e:
        logger.error(f'Duplicate user email attempt: {body.email} by {auth.user.email}')
        raise AccountDuplicationError(field='email')


@router.post('/update')
async def update(body: UserUpdateDto, auth: Auth = GetAuth()):
    logger.info(f'Update user request for {body.email} by {auth.user.email}')

    if not auth.user.is_root and body.is_root:
        logger.error(f'Unauthorized attempt to create root user by {auth.user.email}')
        raise ForbiddenError('You are not authorized to create a root user.')

    if body.roles:
        body.roles = await roles_validate(body.roles, auth)

    result = await User.update_one_from(User.email == body.email, body)
    logger.info(
        f'User {body.email} updated: {result.modified_count} document(s) modified'
    )
    return result.modified_count


@router.post('/delete')
async def delete(user: UserEmailRequest, auth: Auth = GetAuth()):
    logger.info(f'Delete user request for {user.email} by {auth.user.email}')
    result = await User.find_one(User.email == user.email).delete()
    logger.info(
        f'User {user.email} deleted: {result.deleted_count} document(s) deleted'
    )
    return result.deleted_count


@router.post('/change-password')
async def change_password(body: AccountChangePasswordRequest, auth: Auth = GetAuth()):
    logger.info(f'Change password request for {body.email} by {auth.user.email}')
    result = await User.find_one(User.email == body.email).update(
        {'$set': {User.password_hash: User.new_password_hash(body.newPassword)}}
    )
    if result.modified_count > 0:
        logger.info(f'Password changed successfully for {body.email}')
    else:
        logger.warning(f'Password change failed for {body.email}')
    return {'success': result.modified_count > 0}


@router.get('/fetch')
async def fetch(auth: Auth = GetAuth()):
    logger.info(f'Fetch users request by {auth.user.email}')

    query = [User.email != auth.user.email]

    users = await User.find_many(*query, projection_model=UserResponseDto).to_list()
    logger.info(f'Fetched {len(users)} user(s) for {auth.user.email}')
    return users
