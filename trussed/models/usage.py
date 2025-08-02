from typing import *
from datetime import datetime, UTC
from pydantic import Field
from beanie import PydanticObjectId, TimeSeriesConfig, Granularity
from pymongo import IndexModel

from . import AppDocument
from .policies import (
    PiiAction,
    InvisibleTextAction,
    LanguageAction,
    InjectionAction,
    TopicsAction,
)


class UsageError(TypedDict, total=False):
    """
    Generic OpenAI-like error structure
    """

    message: str
    type: str | None
    code: str | None
    param: str | None
    http_code: int
    is_internal: bool


PolicyPriority = Literal['Low', 'Medium', 'High']


class PolicyEvent(TypedDict):
    policy: str
    action: str
    priority: NotRequired[int]
    samples: NotRequired[list[str]]


class UsageMetadata(TypedDict, total=False):
    scopes: list[str] | None

    provider: str
    ownership_id: PydanticObjectId
    key_id: PydanticObjectId
    llm_id: PydanticObjectId
    pool_id: PydanticObjectId
    dev_id: str

    model: str
    alias: str
    target: str
    tags: set[str]


class Usage(AppDocument, extra='allow'):
    scoped_context_enable: ClassVar[bool] = True
    scoped_context_field: ClassVar[str] = 'metadata.scopes'

    metadata: UsageMetadata
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    response_time: float = 0

    is_error: int = 0
    is_warning: int = 0
    is_stream: int = 0

    request_body: dict | None = None
    error: UsageError | None = None
    warning: UsageError | None = None

    request_id: str | None = None

    policy_digest: str | None = None
    policy_events: list[PolicyEvent] | None = None
    policy_count: int = 0
    policy_triggered: int = 0

    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None

    prompt_cost: float | None = None
    completion_cost: float | None = None
    total_cost: float | None = None

    class Settings:
        timeseries = TimeSeriesConfig(
            time_field='timestamp',
            meta_field='metadata',
            granularity=Granularity.hours,
        )
        indexes = [
            IndexModel(['metadata.scopes']),
            # TODO: Swap
            IndexModel(['timestamp', 'metadata.llm_id']),
            IndexModel(['timestamp', 'metadata.key_id']),
            IndexModel(['timestamp', 'is_error']),
            IndexModel(['timestamp', 'is_warning']),
        ]
