import logging
import pytz

from fastapi import APIRouter
from pydantic import BaseModel
from beanie import PydanticObjectId, UpdateResponse
from pymongo.errors import DuplicateKeyError
from types import *

from control_panel.config import ENVIRONMENT
from control_panel.utils import deduplicate_dicts
from control_panel.deps.auth import Auth, GetAuth, AcAPIRouter

from trussed.errors import *
from trussed.models import budgetctl
from trussed.models.budget import *
from trussed.models.appllm import AppLlm, fetch_appllm


log = logging.getLogger(__name__)
logging.getLogger('trussed.models.budgetctl').setLevel(logging.DEBUG)

router = AcAPIRouter(prefix='/budget', tags=['Budgets'])
router.ac_allow_global_permission_for = {Budget}


class DescriptiveBudgetMode(BaseModel):
    name: str
    value: BudgetMode
    supported_periods: list[BudgetPeriod]


descriptive_modes_list = [
    DescriptiveBudgetMode(
        name='Recurring', value='Recurring', supported_periods=['Monthly']
    ),
    DescriptiveBudgetMode(
        name='Expiring', value='Expiring', supported_periods=['Monthly', 'Custom']
    ),
]


@router.get('/modes')
async def modes() -> list[BudgetMode]:
    log.info("Fetching budget modes")
    try:
        modes = [*get_args(BudgetMode)]
        log.debug(f"Retrieved modes: {modes}")
        return modes
    except Exception as e:
        log.error("Error fetching budget modes", exc_info=True)
        raise


@router.get('/descriptive-modes')
async def descriptive_modes() -> list[DescriptiveBudgetMode]:
    log.info("Fetching descriptive budget modes")
    try:
        log.debug(f"Descriptive modes list: {descriptive_modes_list}")
        return descriptive_modes_list
    except Exception as e:
        log.error("Error fetching descriptive budget modes", exc_info=True)
        raise


@router.get('/watch-periods')
async def watch_periods() -> list[BudgetPeriod]:
    log.info("Fetching watch periods")
    try:
        periods: list[BudgetPeriod] = [*get_args(BudgetPeriod)]
        log.debug(f"Initial watch periods: {periods}")

        if ENVIRONMENT == 'production' and 'Minutely' in periods:
            periods.remove('Minutely')
            log.debug("Removed 'Minutely' period in production environment")

        log.debug(f"Final watch periods: {periods}")
        return periods
    except Exception as e:
        log.error("Error fetching watch periods", exc_info=True)
        raise


@router.get('/watch-objects')
async def watch_objects(auth: Auth = GetAuth()) -> list[AppLlm]:
    log.info(f"Fetching watch objects for user: {auth.user.id}")
    try:
        objects = await fetch_appllm()
        log.debug(f"Fetched objects: {objects}")

        used_watch_names = list(
            map(lambda el: el.watch[0]['name'], await Budget.find_many().to_list())
        )
        log.debug(f"Used watch names: {used_watch_names}")

        filtered_objects = [obj for obj in objects if obj['name'] not in used_watch_names]
        log.debug(f"Filtered watch objects: {filtered_objects}")

        return filtered_objects
    except Exception as e:
        log.error("Error fetching watch objects", exc_info=True)
        raise


@router.post('/create')
async def create(body: BudgetCreateDto, auth: Auth = GetAuth()) -> BudgetOutDto:
    log.info(f"Creating budget for user: {auth.user.id}")
    try:
        budget = Budget.model_validate(body, from_attributes=True)
        budget.ownership_id = auth.user.ownership_id
        log.debug(f"Budget data validated: {budget}")

        try:
            await budget.insert()
            log.info(f"Budget inserted with ID: {budget.id}")
        except DuplicateKeyError as e:
            log.warning(f"Duplicate key error on budget creation: {e}")
            raise Budget.error_from_mongo(e) from None

        await budgetctl.check_appllm(budget)
        log.debug("Checked AppLlm for budget")

        await budgetctl.share_tags(budget)
        log.debug("Shared tags for budget")

        return budget
    except Exception as e:
        log.error("Error creating budget", exc_info=True)
        raise


@router.get('/get', dependencies=[GetAuth()], response_model=BudgetOutDto)
async def get(id: PydanticObjectId, allobjects=True, auth: Auth = GetAuth()):
    log.info(f"Fetching budget with ID: {id} for user: {auth.user.id}")
    try:
        budget = await Budget.find_one(Budget.id == id)
        log.debug(f"Retrieved budget: {budget}")

        if not budget:
            log.warning(f"Budget with ID {id} does not exist")
            raise NotFoundError('Budget does not exist')

        if allobjects:
            watch = await fetch_appllm()
            log.debug(f"Fetched watch objects: {watch}")
            budget.watch = deduplicate_dicts(budget.watch, watch, 'object_id')
            log.debug(f"Updated budget watch: {budget.watch}")

        return budget
    except NotFoundError:
        raise
    except Exception as e:
        log.error(f"Error fetching budget with ID {id}", exc_info=True)
        raise


@router.post('/update', dependencies=[GetAuth()])
async def update(upd: BudgetUpdateDto, id: PydanticObjectId):
    log.info(f"Updating budget with ID: {id}")
    try:
        old: Budget | None

        try:
            old = await Budget.update_one_from(
                Budget.id == id,
                upd,
                response_type=UpdateResponse.OLD_DOCUMENT,
            )
            log.debug(f"Old budget data: {old}")
        except DuplicateKeyError as e:
            log.warning(f"Duplicate key error on budget update: {e}")
            raise Budget.error_from_mongo(e) from None

        if not old:
            log.warning(f"No budget found to update with ID: {id}")
            return 0

        if new := await Budget.find_one(Budget.id == id):
            log.debug(f"New budget data after update: {new}")

            await budgetctl.unlock_appllm(old)
            log.debug("Unlocked AppLlm for old budget")

            await budgetctl.unshare_tags(old)
            log.debug("Unshared tags for old budget")

            await budgetctl.check_appllm(new)
            log.debug("Checked AppLlm for new budget")

            await budgetctl.share_tags(new)
            log.debug("Shared tags for new budget")

        return 1
    except Exception as e:
        log.error(f"Error updating budget with ID {id}", exc_info=True)
        raise


@router.post('/delete', dependencies=[GetAuth()])
async def delete(id: PydanticObjectId):
    log.info(f"Deleting budget with ID: {id}")
    try:
        if budget := await Budget.find_one(Budget.id == id):
            await budget.delete()
            log.info(f"Budget with ID {id} deleted")

            await budgetctl.unlock_appllm(budget)
            log.debug("Unlocked AppLlm for deleted budget")

            await budgetctl.unshare_tags(budget)
            log.debug("Unshared tags for deleted budget")

            return 1

        log.warning(f"No budget found to delete with ID: {id}")
        return 0
    except Exception as e:
        log.error(f"Error deleting budget with ID {id}", exc_info=True)
        raise


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch():
    log.info("Fetching all budgets")
    try:
        objects = await Budget.find_many(projection_model=BudgetOutDto).to_list()
        log.debug(f"Fetched budgets: {objects}")
        return objects
    except Exception as e:
        log.error("Error fetching budgets", exc_info=True)
        raise
