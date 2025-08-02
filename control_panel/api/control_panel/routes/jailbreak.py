import logging

from typing import *
from pydantic import BaseModel
from fastapi import APIRouter

from trussed.models.policies import LanguageAction, InjectionAction, TopicsAction
from trussed.languages import LanguageData, languages

from ..deps.auth import GetAuth


log = logging.getLogger(__name__)
router = APIRouter()


class DescritpiveLanguageAction(BaseModel):
    name: str
    value: LanguageAction


class DescritpiveInjectionAction(BaseModel):
    name: str
    value: InjectionAction


class DescritpiveTopicsAction(BaseModel):
    name: str
    value: TopicsAction


descriptive_languages_actions = [
    DescritpiveLanguageAction(
        name='Disabled',
        value='Disabled',
    ),
    DescritpiveLanguageAction(
        name='Sanitization (remove sentences in unallowed languages)',
        value='Sanitization',
    ),
    DescritpiveLanguageAction(
        name='Custom response (no LLM will be invoked)',
        value='CustomResponse',
    ),
    DescritpiveLanguageAction(
        name='Ban (return an error; no LLM will be invoked)',
        value='Ban',
    ),
]

descriptive_injection_actions = [
    DescritpiveInjectionAction(
        name='Disabled',
        value='Disabled',
    ),
    DescritpiveInjectionAction(
        name='Sanitization (remove sentences with detected injections)',
        value='Sanitization',
    ),
    DescritpiveInjectionAction(
        name='Custom response (no LLM will be invoked)',
        value='CustomResponse',
    ),
    DescritpiveInjectionAction(
        name='Ban (return an error; no LLM will be invoked)',
        value='Ban',
    ),
]

descriptive_ropics_actions = [
    DescritpiveTopicsAction(
        name='Disabled',
        value='Disabled',
    ),
    DescritpiveTopicsAction(
        name='Custom response (no LLM will be invoked)',
        value='CustomResponse',
    ),
    DescritpiveTopicsAction(
        name='Ban (return an error; no LLM will be invoked)',
        value='Ban',
    ),
]


@router.get('/languages', dependencies=[GetAuth()])
async def language_list() -> list[LanguageData]:
    return languages


@router.get('/languages/descriptive-actions', dependencies=[GetAuth()])
async def language_actions() -> list[DescritpiveLanguageAction]:
    return descriptive_languages_actions


@router.get('/injection/descriptive-actions', dependencies=[GetAuth()])
async def injection_actions() -> list[DescritpiveInjectionAction]:
    return descriptive_injection_actions


@router.get('/topics/suggestions', dependencies=[GetAuth()])
async def topic_suggestions() -> list[str]:
    return [
        'violence',
        'abuse',
        'profanity',
        'suicide',
        'harmful behavior',
        'scam',
        'fraud',
        'politics',
        'religion',
        'pedophilia',
        'porn',
        'self-harm',
        'substance abuse',
    ]


@router.get('/topics/descriptive-actions', dependencies=[GetAuth()])
async def topic_actions() -> list[DescritpiveTopicsAction]:
    return descriptive_ropics_actions
