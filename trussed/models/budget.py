from typing import *

from datetime import datetime
from operator import itemgetter
from beanie import PydanticObjectId
from pymongo import IndexModel

from pydantic import BaseModel, Field
from pydantic import model_validator

from ..pydantic import Timezone, TzDatetime, custom_validation_error
from ..errors import AlreadyBudgetedError

from . import AppDocument, BaseCreateModel, BaseUpdateModel
from .systag import SysTag
from .appllm import AppLlm
from .usagestats import CostUsage


BudgetPeriod = Literal[
    #'Daily',
    #'Weekly',
    'Monthly',
    'Minutely',
    'Custom',
]

BudgetMode = Literal[
    'Recurring',
    'Expiring',
]


class Budget(AppDocument):
    scoped_context_enable: ClassVar[bool] = True

    ownership_id: PydanticObjectId | None = None
    name: str
    period: BudgetPeriod
    mode: BudgetMode
    timezone: Timezone | None = None
    watch: list[AppLlm] = Field(min_items=1, max_items=1)

    budget: float
    limited: bool = True

    tags: list[str] | None = None
    system_tags: list[SysTag] | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Boundaries of the custom period
    starts_at: TzDatetime | None = None
    ends_at: TzDatetime | None = None

    class Settings:
        indexes = [
            IndexModel(['scopes']),
            IndexModel(['ownership_id', 'watch.object_id'], unique=True),
        ]

    @classmethod
    def error_from_mongo(cls, e):
        if kv := e.details.get('keyValue'):
            if oid := kv.get('watch.object_id'):
                return AlreadyBudgetedError('Selected object is already budgeted')

        return e


class BudgetCreateDto(BaseCreateModel):
    name: str
    period: BudgetPeriod
    mode: BudgetMode = 'Recurring'
    timezone: Timezone | None = None
    watch: list[AppLlm]
    budget: float
    limited: bool = True

    tags: list[str] | None = None

    starts_at: TzDatetime | None = None
    ends_at: TzDatetime | None = None

    @model_validator(mode='after')
    def valdate_after(self):
        self.watch = [*filter(itemgetter('enabled'), self.watch)]

        if self.period == 'Custom':
            self.mode = 'Expiring'
            CustomBudgetCreate.model_validate(self, from_attributes=True)

        return self


class CustomBudgetCreate(BaseCreateModel):
    mode: Literal['Expiring'] | None = None
    starts_at: TzDatetime
    ends_at: TzDatetime


class BudgetOutDto(Budget):
    pass


class BudgetUpdateDto(BaseUpdateModel):
    name: str | None = None
    period: BudgetPeriod | None = None
    mode: BudgetMode | None = None
    timezone: Timezone | None = None
    watch: list[AppLlm] | None
    budget: float | None = None
    limited: bool | None = None

    tags: list[str] | None = None

    starts_at: TzDatetime | None = None
    ends_at: TzDatetime | None = None

    @model_validator(mode='after')
    def valdate_after(self):
        self.watch = [*filter(itemgetter('enabled'), self.watch)]
        return self


def validate_budget(budget: Budget):
    if budget.period == 'Custom':
        for i in ('starts_at', 'ends_at'):
            if not getattr(budget, i, None):
                raise custom_validation_error(
                    type(budget).__name__,
                    'missing',
                    'Boundaries of custom period are missing',
                    (i,),
                )
