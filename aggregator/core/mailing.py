import logging
import asyncio
import jinja2
import aiosmtplib

from base64 import b64encode
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from typing import *
from trussed.models.mail import Mail
from . import env

log = logging.getLogger(__name__)


jn2env = jinja2.Environment(
    loader=jinja2.PackageLoader('trussed'),
    autoescape=jinja2.select_autoescape(),
)


async def sendmail():
    retry_after = env.int('SMTP_RETRY_AFTER', 60)
    retry_max = env.int('SMTP_RETRY_MAX', 3)
    delay = env.int('SMTP_DELAY', 0)

    while mail := await Mail.next(retry_after, retry_max):
        log.info('Send %s (%s)', mail.key, mail.subject)

        try:
            await send(mail)
            await mail.delete()
        except Exception as e:
            log.exception(e)

        await asyncio.sleep(delay)


async def send(mail: Mail):
    username: str | bytes | None
    password: str | bytes | None

    template = jn2env.get_template(mail.template_name)
    html = template.render(_domain=env.str('DOMAIN'), **mail.template_body)

    message = MIMEMultipart('alternative')
    message['From'] = env.str('SMTP_FROM')
    message['To'] = ', '.join(mail.emails)
    message['Subject'] = mail.subject
    message.attach(MIMEText(mail.subject, 'plain', 'utf-8'))
    message.attach(MIMEText(html, 'html', 'utf-8'))

    username = env.str('SMTP_USER', None)
    password = env.str('SMTP_PASSWORD', None)

    if env.bool('SMTP_SENDGRID', False):
        username = b64encode(username) if username else username
        password = b64encode(password) if password else password

    await aiosmtplib.send(
        message,
        hostname=env.str('SMTP_HOST'),
        port=env.int('SMTP_PORT'),
        username=username,
        password=password,
        timeout=env.float('SMTP_TIMEOUT', 5),
    )
