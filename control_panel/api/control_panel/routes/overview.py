import logging

from typing import Self, Iterator
from itertools import chain
from datetime import datetime, UTC
from bisect import bisect

from fastapi import APIRouter, Depends
from beanie import PydanticObjectId
from pydantic import BaseModel, PlainSerializer, model_validator, computed_field

from trussed.models.usage import *
from trussed.utils.cache import cache
from trussed.models.policies import PolicyType
from trussed.models.usagestats import TimeRange, BaseUsageAggregation, BaseUsageStats
from trussed.models.aggregation import BaseAggregation
from ..deps.auth import GetAuth, AcAPIRouter


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/overview', tags=['Overview'])
router.ac_allow_global_permission_for = {Usage}


titles: dict[PolicyType | str, str] = {
    'InvisibleText': 'Invisible Text Detected',
    'Languages': 'Unknown Language Detected',
    'Injection': 'Prompt Injection Deteted',
    'Topics': 'Topic Detected',
    'PII': 'PII Detected',
    'CodeProvenance': 'Third-party Code Snippets Detected',
}

descriptions: dict[PolicyType | str, str] = {
    'InvisibleText': 'Invisible Text Detected',
    'Languages': 'Unknown Language Detected',
    'Injection': 'Attempt to override system instructions with "" prompt.',
    'Topics': 'Topic Detected',
    'PII': 'PII Detected',
    'CodeProvenance': 'Third-party Code Snippets Detected',
}

priorities = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Critical',
}


@cache
def get_priority_name(value: int) -> str:
    return priorities[bisect([*priorities], value)]


class PolicyEventDto(BaseModel):
    title: str
    description: str
    priorityno: int
    created_at: datetime

    @computed_field
    @property
    def priority(self) -> str:
        return get_priority_name(self.priorityno)

    @classmethod
    def from_usage(cls, usage: Usage):
        for event in usage.policy_events or ():
            title = titles.get(event['policy'], event['policy'])

            match event['policy']:
                case 'InvisibleText':
                    title = 'Invisible Text Detected'
                    description = 'Invisible Text Detected'
                case 'Languages': 
                    title = 'Unknown Language Detected'
                    sample = next(iter(event.get('samples', [])))
                    description = f'Detected "{sample}" in prompt.'
                case 'Injection': 
                    title = 'Prompt Injection Detected'
                    sample = next(iter(event.get('samples', [])))
                    description = f'Attempt to override system instructions with "{sample}" prompt.'
                case 'Topics': 
                    title = 'Topic Detected'
                    description = 'Topic Detected'
                case 'PII': 
                    title = 'PII Detected'
                    sample = ', '.join(event.get('samples', []))
                    description = f'Detected {sample} in prompt.'
                case 'CodeProvenance': 
                    title = 'Third-party Code Snippets Detected'
                    description = 'Third-party Code Snippets Detected'

            yield PolicyEventDto(
                title=title,
                description=description,
                priorityno=event.get('priority', 1),
                created_at=usage.timestamp,
            )


class UsagePolicy(BaseUsageAggregation):
    usage: Annotated[Usage, {'$first': '$$ROOT'}]

    @classmethod
    def make_group_id(cls, *args, **kwargs):
        return '$policy_digest'


@router.get('/policies', dependencies=[GetAuth()])
async def policies(time: TimeRange = Depends()):
    pipeline = [
        *UsagePolicy.stage_match(time=time),
        *UsagePolicy.stage_sort('-timestamp'),
        *UsagePolicy.stage_group(),
        *UsagePolicy.stage_sort('-usage.timestamp'),
    ]

    q = Usage.aggregate(pipeline, UsagePolicy)
    return [*chain.from_iterable([PolicyEventDto.from_usage(i.usage) async for i in q])]





