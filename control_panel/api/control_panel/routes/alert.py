import logging
import pytz
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
from beanie import PydanticObjectId
from types import *

from control_panel.config import ENVIRONMENT
from control_panel.utils import deduplicate_dicts
from control_panel.deps.auth import Auth, GetAuth, AcAPIRouter
from control_panel.errors import *

from trussed.models.llm import Llm
from trussed.models.apikey import Apikey
from trussed.models.appllm import AppLlm, AppLlmType, fetch_appllm
from trussed.models.alert import *

# Obtain the logger for this module
log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/alert', tags=['Alerts'])
router.ac_allow_global_permission_for = {Alert, AlertLog}


@router.get('/timezones')
async def timezones():
    log.debug("Received request to fetch common timezones")
    try:
        timezones = pytz.common_timezones
        log.info("Successfully fetched common timezones")
        return timezones
    except Exception as e:
        log.error("Error fetching timezones", exc_info=True)
        raise


@router.get('/watch-periods')
async def watch_periods() -> list[AlertPeriod]:
    log.debug("Received request to fetch watch periods")
    try:
        periods: list[AlertPeriod] = [*get_args(AlertPeriod)]
        log.debug(f"Initial watch periods: {periods}")

        if ENVIRONMENT == 'production' and 'Minutely' in periods:
            log.info("Environment is production; removing 'Minutely' period")
            periods.remove('Minutely')

        log.info(f"Final watch periods: {periods}")
        return periods
    except Exception as e:
        log.error("Error fetching watch periods", exc_info=True)
        raise


@router.get('/watch-types')
async def watch_types() -> list[AppLlmType]:
    log.debug("Received request to fetch watch types")
    try:
        watch_types = [*get_args(AppLlmType)]
        log.info(f"Successfully fetched watch types: {watch_types}")
        return watch_types
    except Exception as e:
        log.error("Error fetching watch types", exc_info=True)
        raise


@router.get('/watch-objects')
async def watch_objects(auth: Auth = GetAuth()) -> list[AppLlm]:
    log.debug(f"Received request to fetch watch objects for user: {auth.user.id}")
    try:
        watch_objects = await fetch_appllm()
        log.info(f"Successfully fetched {len(watch_objects)} watch objects for user: {auth.user.id}")
        return watch_objects
    except Exception as e:
        log.error(f"Error fetching watch objects for user {auth.user.id}", exc_info=True)
        raise


@router.post('/create')
async def create(body: AlertCreateDto, auth: Auth = GetAuth()) -> AlertOutDto:
    log.debug(f"Received request to create alert: {body} by user: {auth.user.id}")
    try:
        alert = Alert.model_validate(body, from_attributes=True)
        alert.ownership_id = auth.user.ownership_id

        log.info(f"Creating alert: {alert} by user: {auth.user.id}")

        await alert.insert()
        log.info(f"Alert created with ID: {alert.id} by user: {auth.user.id}")
        return alert
    except Exception as e:
        log.error(f"Error creating alert by user {auth.user.id}", exc_info=True)
        raise


@router.get('/get', dependencies=[GetAuth()], response_model=AlertOutDto)
async def get(id: PydanticObjectId, allobjects=True, auth: Auth = GetAuth()):
    log.debug(f"Received request to get alert with ID: {id} by user: {auth.user.id}")
    try:
        alert = await Alert.find_one(Alert.id == id)
        if not alert:
            log.warning(f"Alert with ID: {id} not found for user: {auth.user.id}")
            raise NotFoundError('Alert does not exist')

        log.debug(f"Fetched alert: {alert} for user: {auth.user.id}")

        if allobjects:
            log.debug("Fetching associated watch objects")
            watch = await fetch_appllm()
            alert.watch = deduplicate_dicts(alert.watch, watch, 'object_id')
            log.info(f"Associated watch objects updated for alert ID: {id}")

        await alert.ensure_budget()
        log.debug(f"Budget ensured for alert ID: {id}")
        await alert.forecast_budget()
        log.debug(f"Budget forecasted for alert ID: {id}")

        log.info(f"Successfully fetched alert with ID: {id} for user: {auth.user.id}")
        return alert
    except NotFoundError:
        raise  # Already logged above
    except Exception as e:
        log.error(f"Error fetching alert with ID: {id} for user {auth.user.id}", exc_info=True)
        raise


@router.post('/update', dependencies=[GetAuth()])
async def update(body: AlertUpdateDto, id: PydanticObjectId):
    log.debug(f"Received request to update alert with ID: {id} with data: {body}")
    try:
        result = await Alert.update_one_from(Alert.id == id, body)
        log.info(f"Alert update result for ID {id}: {result.modified_count} document(s) modified")
        return result.modified_count
    except Exception as e:
        log.error(f"Error updating alert with ID: {id}", exc_info=True)
        raise


@router.post('/delete', dependencies=[GetAuth()])
async def delete(id: PydanticObjectId):
    log.debug(f"Received request to delete alert with ID: {id}")
    try:
        result = await Alert.find_one(Alert.id == id).delete()
        if result.deleted_count:
            log.info(f"Successfully deleted alert with ID: {id}")
        else:
            log.warning(f"No alert found to delete with ID: {id}")
        return result.deleted_count
    except Exception as e:
        log.error(f"Error deleting alert with ID: {id}", exc_info=True)
        raise


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch():
    log.debug("Received request to fetch all alerts")
    try:
        objects = await Alert.find_many(projection_model=AlertOutDto).to_list()
        log.info(f"Fetched {len(objects)} alerts")

        for alert in objects:
            log.debug(f"Ensuring budget for alert ID: {alert.id}")
            await alert.ensure_budget()
            log.debug(f"Forecasting budget for alert ID: {alert.id}")
            await alert.forecast_budget()

        log.info("Successfully processed all fetched alerts")
        return objects
    except Exception as e:
        log.error("Error fetching alerts", exc_info=True)
        raise


@router.get('/triggered/fetch', dependencies=[GetAuth()])
async def fetch_triggered():
    log.debug("Received request to fetch triggered alerts")
    try:
        q = AlertLog.find(AlertLog.log_type == 'Triggered')
        triggered_logs = await q.to_list(1000) or []
        log.info(f"Fetched {len(triggered_logs)} triggered alert logs")
        return triggered_logs
    except Exception as e:
        log.error("Error fetching triggered alert logs", exc_info=True)
        raise


@router.get('/triggered/unchecked-count', dependencies=[GetAuth()])
async def count_triggered_unchecked():
    log.debug("Received request to count unchecked triggered alerts")
    try:
        q = AlertLog.find(AlertLog.log_type == 'Triggered', AlertLog.checked_at == None)
        count = await q.count()
        log.info(f"Count of unchecked triggered alerts: {count}")
        return count
    except Exception as e:
        log.error("Error counting unchecked triggered alerts", exc_info=True)
        raise


@router.post('/triggered/check', dependencies=[GetAuth()])
async def check_triggered(id: PydanticObjectId):
    log.debug(f"Received request to check triggered alert log with ID: {id}")
    try:
        q = AlertLog.find(AlertLog.id == id)
        result = await q.update({'$set': {AlertLog.checked_at: datetime.utcnow()}})
        if result.modified_count:
            log.info(f"Successfully checked triggered alert log with ID: {id}")
        else:
            log.warning(f"No triggered alert log found to check with ID: {id}")
        return result.modified_count
    except Exception as e:
        log.error(f"Error checking triggered alert log with ID: {id}", exc_info=True)
        raise
