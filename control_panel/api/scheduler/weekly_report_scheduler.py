"""
This file sets up an APScheduler job that runs every minute.
The job:
 - Loads the weekly report configuration.
 - Checks if the weekly report is enabled.
 - Gets the current time in the configured timezone.
 - Calls _send_weekly_report to send the email if the scheduled time has passed.
 - if the email was already sent for the period the job simply returns early—preventing duplicate emails.
"""

import logging
from datetime import datetime, UTC
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from trussed.models.weekly_report import ReportConfig
from control_panel.routes.weekly_report import _send_weekly_report

log = logging.getLogger(__name__)


async def scheduled_weekly_report_job():
    log.debug("Running scheduled weekly report job.")
    config = await ReportConfig.find_one({'enabled': True})

    if not config:
        log.debug("Weekly report configuration not found or disabled.")
        return

    if not config.emails:
        log.debug("No emails configured for weekly report.")
        return

    if config.send_at and config.send_at < datetime.now(UTC):
        try:
            result = await _send_weekly_report(datetime.now(), config)
            log.debug("Scheduled weekly report job result: %s", result)
        finally:
            await config.schedule(ensure_next=True).replace()


def start_scheduler():
    # Run the scheduler job every minute so that the check happens frequently.
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(scheduled_weekly_report_job, 'interval', seconds=60)
    scheduler.start()
    log.info("Weekly report scheduler started.")
    return scheduler 