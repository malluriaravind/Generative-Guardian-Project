import logging

from typing import *

from pydantic import BaseModel
from fastapi import APIRouter

from trussed.models.policies import InvisibleTextAction
from ..deps.auth import GetAuth


log = logging.getLogger(__name__)
router = APIRouter(prefix='/invisible-text', tags=['InvisibleText'])


class DescritpiveAction(BaseModel):
    name: str
    value: InvisibleTextAction


descriptive_actions = [
    DescritpiveAction(
        name='Sanitization (remove hidden characters)',
        value='Sanitization',
    ),
    DescritpiveAction(
        name='Ban (return an error; no LLM will be invoked)',
        value='Ban',
    ),
]


@router.get('/descriptive-actions', dependencies=[GetAuth()])
async def actions() -> list[DescritpiveAction]:
    return descriptive_actions
