import pytz

from typing import *
from operator import itemgetter
from datetime import datetime, UTC
from dateutil.relativedelta import relativedelta, MO
from beanie import PydanticObjectId
from beanie.odm.operators.update.general import Set
from pymongo import IndexModel, DESCENDING

from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    model_validator,
    computed_field,
)

from . import AppDocument, BaseCreateModel, BaseUpdateModel
from .budget import Budget
from .appllm import AppLlm, AppLlmType
from .usagestats import CostUsage, TimeRange
from ..pydantic import Timezone, TzDatetime


AlertPeriod = Literal['Daily', 'Weekly', 'Monthly', 'Minutely']
AlertThreshold = Literal['Ok', 'Exceeded']
AlertLogType = Literal['Triggered', 'Recycled']


# fmt: off
class PeriodBoundary:
    Align = Literal['+', '-']

    boundaries: dict[tuple[Align, AlertPeriod], relativedelta] = {
        ('+', 'Minutely'): relativedelta(minutes=1, second=0, microsecond=0),
        ('+', 'Daily'): relativedelta(days=1, hour=0, minute=0, second=0, microsecond=0),
        ('+', 'Weekly'): relativedelta(days=1, weekday=MO(+1), hour=0, minute=0, second=0, microsecond=0),
        ('+', 'Monthly'): relativedelta(months=1, day=1, hour=0, minute=0, second=0, microsecond=0),
        #
        ('-', 'Minutely'): relativedelta(second=0, microsecond=0),
        ('-', 'Daily'): relativedelta(hour=0, minute=0, second=0, microsecond=0),
        ('-', 'Weekly'): relativedelta(weekday=MO(-1), hour=0, minute=0, second=0, microsecond=0),
        ('-', 'Monthly'): relativedelta(day=1, hour=0, minute=0, second=0, microsecond=0),
    }

    def __new__(cls, align: Align, period: AlertPeriod, tz='UTC', dt: datetime = None):
        dt = dt or datetime.now(pytz.timezone(tz))

        if delta := cls.boundaries.get((align, period)):
            return dt + delta

        raise ValueError(f'Invalid period type: {align}{period}')
# fmt: on


class Alert(AppDocument):
    scoped_context_enable: ClassVar[bool] = True

    ownership_id: PydanticObjectId | None = None
    name: str
    period: AlertPeriod
    timezone: Timezone
    threshold: AlertThreshold = 'Ok'
    watch: list[AppLlm]

    budget: float | None = None
    # Use a % of the budget associated with the App/LLM
    # Call the ensure_budget() to set the budget
    budget_percentage: float | None = None

    used: float = 0
    notify_to: list[EmailStr] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    triggered_at: datetime | None = None
    triggered_object: AppLlm | None = None

    # Boundaries of watching period
    starts_at: TzDatetime | None = None
    ends_at: TzDatetime | None = None

    _forecasted_budget: float = 0

    class Settings:
        use_state_management = True

        indexes = [
            IndexModel(['scopes']),
            IndexModel(['threshold']),
            IndexModel(['recycle_at']),
        ]

    async def trigger(self):
        self.threshold = 'Exceeded'
        self.triggered_at = datetime.now(UTC)
        self.triggered_object = next(iter(self.watch), None)
        alertlog = AlertLog.from_alert(self, log_type='Triggered')

        await self.save_changes()
        await alertlog.insert()
        return alertlog

    async def ensure_budget(self) -> float | None:
        if not self.budget_percentage:
            return self.budget

        self.budget = 0

        if oid := next(iter(self.watch), {}).get('object_id'):
            q = {'ownership_id': self.ownership_id, 'watch.object_id': oid}

            if budget := await Budget.find_one(q):
                self.budget = budget.budget * self.budget_percentage / 100

        return self.budget

    @computed_field
    @property
    def forecasted_budget(self) -> float:
        return self._forecasted_budget

    async def forecast_budget(self):
        app_id = llm_id = None
        time = TimeRange(self.starts_at, self.ends_at)

        if not (watch := next(iter(self.watch), None)):
            return

        match watch['object_type']:
            case 'APP':
                app_id = watch['object_id']

            case 'LLM':
                llm_id = watch['object_id']

            case _:
                raise ValueError(watch['object_type'])

        self._forecasted_budget = await CostUsage.forecast_usage(
            self.used,
            time,
            app_id=app_id,
            llm_id=llm_id,
        )
        return self._forecasted_budget

    async def reset(self):
        await self.find_one(Alert.id == self.id).update_one(
            {
                '$set': {
                    Alert.used: 0,
                    Alert.threshold: 'Ok',
                    Alert.starts_at: PeriodBoundary('-', self.period, self.timezone),
                    Alert.ends_at: PeriodBoundary('+', self.period, self.timezone),
                    Alert.triggered_at: None,
                    Alert.triggered_object: None,
                }
            }
        )

    @model_validator(mode='after')
    def valdate_after(self):
        # if not self.budget and not self.budget_percentage:
        #    raise ValueError('Requires `budget` or `budget_percentage`')

        if not self.starts_at:
            self.starts_at = PeriodBoundary('-', self.period, self.timezone)

        if not self.ends_at:
            self.ends_at = PeriodBoundary('+', self.period, self.timezone)

        return self


class AlertLog(Alert):
    alert_id: PydanticObjectId | None = None
    log_type: AlertLogType | None = None
    checked_at: datetime | None = None
    expires_at: datetime | None = None

    class Settings:
        use_state_management = True

        indexes = [
            IndexModel(['log_type', ('created_at', DESCENDING)]),
            IndexModel(['expires_at'], expireAfterSeconds=0),
        ]

    @classmethod
    def from_alert(cls, alert: Alert, log_type: AlertLogType):
        alertlog = cls.model_validate(alert, from_attributes=True)
        alertlog.id = None
        alertlog.alert_id = alert.id
        alertlog.log_type = log_type
        alertlog.created_at = datetime.utcnow()

        # if alert.period == 'Minutely':
        #    ttl = (alert.ends_at - alert.starts_at) * 10
        #    alertlog.expires_at = datetime.utcnow() + ttl

        return alertlog


class AlertCreateDto(BaseCreateModel):
    name: str
    period: AlertPeriod
    timezone: Timezone
    watch: list[AppLlm]
    budget: float | None = None
    budget_percentage: float | None = None
    notify_to: list[EmailStr] = []

    @model_validator(mode='after')
    def valdate_after(self):
        self.watch = [*filter(itemgetter('enabled'), self.watch)]

        return self


class AlertUpdateDto(BaseUpdateModel):
    name: str | None = None
    period: AlertPeriod | None = None
    timezone: Timezone | None = None
    watch: list[AppLlm] | None = Field(default=[])
    budget: float | None = None
    budget_percentage: float | None = None
    notify_to: list[EmailStr] | None = Field(default=[])

    @model_validator(mode='after')
    def valdate_after(self):
        self.watch = [*filter(itemgetter('enabled'), self.watch)]

        return self


class AlertOutDto(Alert):
    pass
