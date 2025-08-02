import logging

from datetime import datetime, UTC

from .budget import Budget
from .systag import SysTag
from .appllm import update_appllm
from .alert import PeriodBoundary
from .usagestats import Usage, CostUsage, TimeRange
from . import Unscoped


log = logging.getLogger(__name__)


Unscoped()
async def share_tags(budget: Budget):
    if not (watch := next(iter(budget.watch), None)):
        return

    system_tags: list[SysTag] = []

    if budget.tags is not None:
        system_tags = [SysTag(tag=tag, ref=budget.id) for tag in budget.tags]

    update = {
        '$set': {
            'updated_at': datetime.now(UTC),
        },
        '$addToSet': {
            'system_tags': {
                '$each': system_tags,
            }
        },
    }

    await update_appllm(watch, update)


Unscoped()
async def unshare_tags(budget: Budget):
    if not (watch := next(iter(budget.watch), None)):
        return

    update = {
        '$set': {
            'updated_at': datetime.now(UTC),
        },
        '$pull': {
            'system_tags': {
                'ref': budget.id,
            }
        },
    }

    await update_appllm(watch, update)


Unscoped()
async def check_appllm(budget: Budget, locking=True, unlocking=True):
    """
    Checks the current usage against the provided budget and performs locking and unlocking actions based on the usage.

    Args:
        budget (Budget): The budget to be checked against.
        locking (bool, optional): Lock App/LLM if usage exceeds the budget.
        unlocking (bool, optional): Unlock App/LLM if usage is below the budget.

    Returns:
        Usage: The current usage after checking and performing any necessary actions.
    """
    if unlocking and not budget.limited:
        await unlock_appllm(budget)
        return 0

    if budget.period == 'Custom':
        now = datetime.now(UTC)

        if not (budget.starts_at < now < budget.ends_at):
            await lock_appllm(budget)
            return 0

    total_cost = await measure_usage(budget)

    if total_cost > budget.budget:
        if locking:
            await lock_appllm(budget)
    elif unlocking:
        await unlock_appllm(budget)

    return total_cost


Unscoped()
def lock_appllm(budget: Budget):
    log.debug('Lock App/LLM %s', budget.watch)

    if budget.mode == 'Expiring' or budget.period == 'Custom':
        return set_unbudgeted_until(budget, datetime.max)

    return set_unbudgeted_until(budget, PeriodBoundary('+', budget.period))


Unscoped()
def unlock_appllm(budget: Budget):
    log.debug('Unlock App/LLM %s', budget.watch)
    return set_unbudgeted_until(budget, None)


Unscoped()
async def set_unbudgeted_until(budget: Budget, dt: datetime | None):
    if not (watch := next(iter(budget.watch), None)):
        return

    update = {
        '$set': {
            'unbudgeted_until': dt,
            'updated_at': datetime.now(UTC),
        }
    }

    await update_appllm(watch, update)


Unscoped()
async def measure_usage(budget: Budget) -> float:
    app_id = None
    llm_id = None
    watch = next(iter(budget.watch), None)

    if not watch:
        return

    if watch['object_type'] == 'APP':
        app_id = watch['object_id']

    if watch['object_type'] == 'LLM':
        llm_id = watch['object_id']

    if budget.period == 'Custom':
        begin = budget.starts_at
    else:
        begin = PeriodBoundary('-', budget.period)

    timerange = TimeRange(begin=begin, end=datetime.now(UTC))

    pipeline = [
        *CostUsage.stage_match(time=timerange, app_id=app_id, llm_id=llm_id),
        *CostUsage.stage_group(),
    ]
    usage = await anext(aiter(Usage.aggregate(pipeline, CostUsage)), None)
    return usage.total_cost if usage else 0
