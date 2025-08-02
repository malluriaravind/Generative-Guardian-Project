from fastapi import APIRouter

from pydantic import BaseModel
from control_panel.deps.auth import Auth, GetAuth
from trussed.models import Scopes
from trussed.models.rbac import Role
from trussed.errors import InvalidScopesError


router = APIRouter(prefix='/scopes', tags=['Scopes'])


class CheckScopes(BaseModel, Scopes):
    pass


@router.post('/check')
def test(body: CheckScopes, auth: Auth = GetAuth()):
    if body.scopes is not None and not auth.user.is_root:
        try:
            auth.rbac.check_for_scopes(body.scopes)
        except InvalidScopesError as e:
            return {
                'error': 'InvalidScopesError',
                'message': 'You do not have access to use these scopes',
            }
    
    return {
        'message': 'Ok',
    }


@router.get('/available')
async def available(auth: Auth = GetAuth()):
    if auth.user.is_root:
        roles = await Role.find_many().to_list()
        scopes = set(scope for role in roles for scope in role.assigned_scopes)
        return sorted(scopes)

    return sorted(auth.rbac.scopes)

