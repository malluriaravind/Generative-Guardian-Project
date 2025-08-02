import logging
import trussed.init

from packaging.version import Version

from fastapi import APIRouter
from control_panel.deps.auth import GetAuth
from trussed.models.maintenance import Heartbeat


log = logging.getLogger(__name__)
router = APIRouter(prefix='/maintenance', tags=['Maintenance'])


@router.get('/heartbeats')
async def heartbeats() -> list[Heartbeat]:
    heartbeats = await Heartbeat.find().to_list()
    heartbeats = sorted(
        heartbeats,
        key=lambda i: (i.appname, Version(i.version), i.hostname),
    )
    return heartbeats
