import logging
from typing import *
from bson import ObjectId
from datetime import datetime
from dataclasses import dataclass

from db import db

from trussed.models.mail import Mail
from trussed.models.appllm import AppLlmType
from trussed.models.alert import *


# Obtain a logger instance for this module
log = logging.getLogger(__name__)


class UsageStats(TypedDict, total=False):
    sum_total_cost: float
    avg_response_time: float


@dataclass
class Aggregation:
    app_ids: list[ObjectId]
    llm_ids: list[ObjectId]
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @classmethod
    def from_alert(cls, alert: Alert):
        grouped: dict[AppLlmType, list[ObjectId]] = {}

        for i in alert.watch or ():
            grouped.setdefault(i['object_type'], []).append(i['object_id'])

        return cls(
            app_ids=grouped.get('APP', []),
            llm_ids=grouped.get('LLM', []),
            starts_at=alert.starts_at,
            ends_at=alert.ends_at,
        )

    async def aggregate(self) -> UsageStats:
        q = {'$match': {}}

        if self.starts_at:
            q['$match'].setdefault('timestamp', {})['$gt'] = self.starts_at

        if self.ends_at:
            q['$match'].setdefault('timestamp', {})['$lt'] = self.ends_at

        if self.app_ids:
            q['$match']['metadata.key_id'] = {'$in': self.app_ids}

        if self.llm_ids:
            q['$match']['metadata.llm_id'] = {'$in': self.llm_ids}

        aggregation = db.usage.aggregate(
            [
                q,
                {
                    '$group': {
                        '_id': None,
                        'sum_total_cost': {'$sum': '$total_cost'},
                    }
                },
            ]
        )

        return await anext(aggregation, {})


async def recycler():
    async for alert in Alert.find(Alert.ends_at < datetime.utcnow()):
        log.warning(
            'Alert recycling initiated: %s',
            alert.name,
            extra={
                'alert_name': alert.name,
                'alert_budget': alert.budget,
                'alert_id': str(alert.id),
                'event': 'recycler',
            }
        )

        await alert.ensure_budget()

        alertlog = AlertLog.from_alert(alert, log_type='Recycled')

        if stats := await Aggregation.from_alert(alert).aggregate():
            alertlog.used = stats['sum_total_cost']

        if alertlog.used:
            await alertlog.insert()
            log.info(
                'Alert used cost recorded: %s',
                alert.name,
                extra={
                    'alert_name': alert.name,
                    'used_cost': alertlog.used,
                    'alert_id': str(alert.id),
                    'event': 'recycler_insert',
                }
            )
        else:
            log.warning(
                'Alert is empty and will be reset %s',
                alert.name,
                extra={
                    'alert_name': alert.name,
                    'alert_budget': alert.budget,
                    'alert_id': str(alert.id),
                    'event': 'recycler_reset',
                }
            )

        await alert.reset()


async def watchdog():
    async for alert in Alert.find():
        stats = await Aggregation.from_alert(alert).aggregate()

        if not stats:
            stats = UsageStats(sum_total_cost=0)

        if alert.used != stats['sum_total_cost']:
            log.info(
                'Alert usage updated: %s',
                alert.name,
                extra={
                    'alert_name': alert.name,
                    'previous_used': alert.used,
                    'current_used': stats['sum_total_cost'],
                    'alert_id': str(alert.id),
                    'event': 'watchdog_update',
                },
            )
            alert.used = stats['sum_total_cost']
            await alert.save_changes()

        if alert.threshold != 'Ok':
            continue

        await alert.ensure_budget()

        if alert.budget and alert.used > alert.budget:
            log.warning(
                'Alert threshold exceeded and is triggering: %s',
                alert.name,
                extra={
                    'alert_name': alert.name,
                    'alert_budget': alert.budget,
                    'used_cost': alert.used,
                    'alert_id': str(alert.id),
                    'event': 'watchdog_trigger',
                }
            )

            alertlog = await alert.trigger()

            mail = Mail(
                key=f'alert:{alert.id}',
                emails=alert.notify_to,
                subject=f'{alert.threshold}: {alert.name} (${round(alert.budget, 3)})',
                template_body=alertlog.model_dump(),
                template_name='alert-triggered.html',
            )
            await mail.enqueue()
            log.info(
                'Alert triggered and email enqueued: %s',
                alert.name,
                extra={
                    'alert_name': alert.name,
                    'alert_id': str(alert.id),
                    'mail_key': mail.key,
                    'event': 'watchdog_email_enqueued',
                }
            )
