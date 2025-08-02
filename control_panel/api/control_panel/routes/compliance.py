from fastapi import APIRouter
from control_panel.deps.auth import Auth, GetAuth
from trussed.models.compliance import Compliance

router = APIRouter(prefix='/compliance', tags=['Compliance'])


@router.get('/')
async def get(auth: Auth = GetAuth()) -> Compliance | None:
    result = await Compliance.find_one(
        Compliance.ownership_id == auth.user.ownership_id
    )
    return result


@router.put('/')
async def upsert(request: dict[str, str], auth: Auth = GetAuth()) -> None:
    await Compliance.find_one(
        Compliance.ownership_id == auth.user.ownership_id
    ).delete()
    compliance = Compliance(ownership_id=auth.user.ownership_id, data=request)
    await compliance.insert()
