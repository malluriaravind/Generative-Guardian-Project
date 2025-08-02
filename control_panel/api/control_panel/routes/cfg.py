import logging
import asyncio
import aiosmtplib

from email.message import EmailMessage
from base64 import b64encode

from fastapi import APIRouter, Request

from control_panel.deps.auth import GetAuth, AcAPIRouter
from control_panel.config import env
from trussed.pydantic import ValidationError, joint_validation_message
from trussed.models.cfg import *


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/cfg', tags=['Configuration variables'])


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch(request: Request) -> list[CfgOut]:
    log.debug("Fetch endpoint called by user: %s", request.client.host)
    try:
        cfg_list = await Cfg.find(projection_model=CfgOut).sort(+Cfg.order).to_list()
        log.info("Fetched %d configuration variables.", len(cfg_list))
        return cfg_list
    except Exception as e:
        log.error("Error fetching configuration variables: %s", str(e))
        raise


@router.post('/update', dependencies=[GetAuth()])
async def update(body: list[UpdateCfg]):
    log.debug("Update endpoint called with %d items.", len(body))
    update: tuple[str, ...] = (Cfg.value, Cfg.extra, Cfg.description)

    try:
        for i in body:
            await Cfg.model_validate(i, from_attributes=True).upsert(update)
    except Exception as e:
        log.error("Error updating configurations: %s", str(e))
        raise

    await Cfg.export_to_environ()

class SMTPRequiredVars(SMTPRequiredVars):
    SMTP_TEST_EMAIL: str


@router.post('/actions/smtp-validate', dependencies=[GetAuth()])
async def smtp_validate(body: list[UpdateCfg]):
    log.debug("SMTP validate endpoint called with %d items.", len(body))
    try:
        options = SMTPRequiredVars.model_validate({i.name: i.value for i in body})
        log.debug("SMTP options validated successfully: %s", options)
    except ValidationError as e:
        message = joint_validation_message(e)
        log.warning("ValidationError during SMTP validation: %s", message)
        return {'error': 'ValidationError', 'message': message}

    if options.SMTP_PASSWORD is None:
        options.SMTP_PASSWORD = env.str('SMTP_PASSWORD', None)
        log.debug("SMTP_PASSWORD loaded from environment.")

    try:
        await send_test_email(options.SMTP_TEST_EMAIL, options)
        log.info("Test email sent to %s successfully.", options.SMTP_TEST_EMAIL)
    except Exception as e:
        log.error("SMTP check failed: %s", str(e))
        return {'error': 'SMTPError', 'message': 'SMTP check failed: ' + str(e)}

    return {
        'message': f'SMTP configuration appears to be valid and ready to save. Test email sent successfully. Check {options.SMTP_TEST_EMAIL} mailbox.'
    }


async def send_test_email(to: str, options: SMTPRequiredVars):
    log.debug("Preparing to send test email to %s.", to)
    message = EmailMessage()
    message['From'] = options.SMTP_FROM
    message['To'] = to
    message['Subject'] = 'Trussed Controller Test'
    message.set_content('If you see this message, email test is passed.')

    username = options.SMTP_USER
    password = options.SMTP_PASSWORD

    if options.SMTP_SENDGRID:
        username = b64encode(username.encode()).decode() if username else username
        password = b64encode(password.encode()).decode() if password else password
        log.debug("SMTP_SENDGRID is enabled. Username and password have been base64 encoded.")

    try:
        await aiosmtplib.send(
            message,
            hostname=options.SMTP_HOST,
            port=options.SMTP_PORT,
            username=username,
            password=password,
            timeout=options.SMTP_TIMEOUT,
        )
        log.info("Test email sent to %s via SMTP host %s:%s.", to, options.SMTP_HOST, options.SMTP_PORT)
    except Exception as e:
        log.error("Failed to send test email: %s", str(e))
        raise
