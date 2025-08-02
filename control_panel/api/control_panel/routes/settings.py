# fmt: off
import logging

from fastapi import APIRouter
from control_panel.deps.auth import Auth, GetAuth
from control_panel.errors import *
from trussed.models.user import *


log = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/profile")
def get_profile_data(auth: Auth = GetAuth()) -> UserResponseDto:
    log.info("GET /settings/profile called by user ID: %s", auth.user.id)

    user = UserResponseDto.model_validate(auth.user, from_attributes=True)
    user.available_api_namespaces = [
        ns for ns, perms in auth.rbac.mapping.items() if 'Read' in perms
    ]

    return user


@router.post("/change-profile-info")
async def change_profile_info(body: ChangeProfileDto, auth: Auth = GetAuth()):
    log.info("POST /settings/change-profile-info called by user ID: %s with data: %s", auth.user.id, body)
    user = auth.user
    try:
        result = await User.find_one(User.id == user.id).update({'$set': body.model_dump(exclude_none=True)})
        success = result.modified_count > 0
        if success:
            log.info("Successfully updated profile info for user ID: %s", user.id)
        else:
            log.warning("No changes made to profile info for user ID: %s", user.id)
        return {'success': success}
    except Exception as e:
        log.error("Error updating profile info for user ID: %s: %s", user.id, str(e))
        raise


@router.post("/change-password")
async def change_password(body: ChangePasswordDto, auth: Auth = GetAuth()):
    log.info("POST /settings/change-password called by user ID: %s", auth.user.id)
    user = auth.user

    if not user.check_password(body.old_password):
        log.warning("Invalid old password attempt for user ID: %s", user.id)
        raise InvalidOldPasswordError()

    try:
        new_password_hash = User.new_password_hash(body.new_password)
        result = await User.find_one(User.id == user.id).update({
            '$set': {
                User.password_hash: new_password_hash
            }
        })
        success = result.modified_count > 0
        if success:
            log.info("Successfully changed password for user ID: %s", user.id)
        else:
            log.warning("Password change failed for user ID: %s", user.id)
        return {'success': success}
    except Exception as e:
        log.error("Error changing password for user ID: %s: %s", user.id, str(e))
        raise
