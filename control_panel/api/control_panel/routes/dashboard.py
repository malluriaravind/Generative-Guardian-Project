from fastapi import APIRouter

from control_panel.deps.auth import Auth, GetAuth
from trussed.models.user import UserResponseDto

router = APIRouter()


@router.get('/me')
def get_me(auth: Auth = GetAuth()) -> UserResponseDto:
    user = UserResponseDto.model_validate(auth.user, from_attributes=True)
    user.available_api_namespaces = [
        ns for ns, perms in auth.rbac.mapping.items() if 'Read' in perms
    ]
    return user



