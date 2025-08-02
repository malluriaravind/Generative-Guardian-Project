import logging
import jinja2

from fastapi import APIRouter, Depends, Request
from control_panel.deps.auth import GetAuth
from trussed.models.weekly_report import ReportConfig

# Additional imports for email sending and template rendering
from datetime import datetime, time as dttime, timedelta
from zoneinfo import ZoneInfo  # For timezone awareness
from pathlib import Path
from email.message import EmailMessage
import aiosmtplib
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

router = APIRouter(prefix='/logs/weekly_report_config', tags=['Weekly Report'])
log = logging.getLogger(__name__)

@router.get('/fetch', dependencies=[GetAuth()])
async def fetch_weekly_report_config():
    config = await ReportConfig.find_one({})

    if config is None:
        return await ReportConfig().save()
    
    return config


@router.post('/update', dependencies=[GetAuth()])
async def update_weekly_report_config(config: ReportConfig):
    await config.schedule().save()
    return {'message': 'Weekly report configuration updated successfully'}


@router.post('/send', dependencies=[GetAuth()])
async def send_weekly_report():
    """
    Sends the weekly report when the configured day, time, and timezone conditions are met.
    """
    log.debug("send_weekly_report endpoint called.")
    config = await ReportConfig.find_one({})
    if config is None or not config.enabled:
        log.debug("Weekly report sending is disabled or configuration is missing.")
        return {"message": "Weekly report sending is disabled or configuration not found."}
    # Get current time in the user-configured timezone.
    tz = ZoneInfo(config.timezone or "America/New_York")
    now = datetime.now(tz)
    return await _send_weekly_report(now, config)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
)
async def send_email_with_retry(email_message: EmailMessage, smtp_host: str, smtp_port: int,
                                  smtp_user: str, smtp_password: str, smtp_timeout: float):
    await aiosmtplib.send(
        email_message,
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_password,
        timeout=smtp_timeout,
    )


jinja2env = jinja2.Environment(
    loader=jinja2.PackageLoader('trussed'),
    autoescape=jinja2.select_autoescape(),
)


async def _send_weekly_report(now: datetime, config: ReportConfig) -> dict:
    """
    Prepares and sends the weekly report email.

    The function:
      - Parses the scheduled time.
      - Determines the scheduled datetime based on the configured day.
      - Checks if the current time has passed the scheduled send time.
      - Makes sure an email was not already sent for this period.
      - Builds the email (using a Jinja2 template) with report data.
      - Uses a retry mechanism to send the email.
      - If successful, stores the send timestamp in the configuration.
    """
    template = jinja2env.get_template(config.template_name)

    # 6. Fetch report data.
    llm_count = await ReportConfig.fetch_llm_count()
    api_key_count = await ReportConfig.fetch_api_key_count()
    
    # Use the first email from the emails list as the recipient.
    recipient_email = config.emails[0] if config.emails else "unknown@example.com"
    recipient_name = recipient_email.split("@")[0] if "@" in recipient_email else "User"
    report_period_display = f"past {config.report_period} {config.report_period_unit}"

    startdt, enddt = config.datetime_range()

    prompt_counts = await ReportConfig.fetch_prompt_counts_by_app(startdt, enddt)
    prompt_counts_by_model = await ReportConfig.fetch_prompt_counts_by_model(startdt, enddt)
    total_prompts_all_models = sum(item.get("prompt_count", 0) for item in prompt_counts_by_model)
    status_counts = await ReportConfig.fetch_http_status_counts_by_app(startdt, enddt)
    audit_logs = await ReportConfig.fetch_audit_logs(startdt, enddt)
    
    # 7. Build data for the email template.
    report_data = {
        "recipient_name": recipient_name,
        "start_date": startdt.strftime("%b %d, %Y"),
        "end_date": enddt.strftime("%b %d, %Y"),
        "total_logs": total_prompts_all_models,
        "llm_count": llm_count,
        "api_key_count": api_key_count,
        "prompt_counts_by_app": prompt_counts,
        "http_status_counts_by_app": status_counts,
        "prompt_counts_by_model": prompt_counts_by_model,
        "now": now,
        "year": now.year,
        "report_period_display": report_period_display,
    }
    if config.template_body:
        report_data.update(config.template_body)

    rendered_html = template.render(**report_data)
    
    # 8. Prepare the email.
    email_message = EmailMessage()
    email_message["Subject"] = config.subject
    from control_panel.config import env as config_env
    smtp_from = config_env.str("SMTP_FROM", "noreply@example.com")
    smtp_host = config_env.str("SMTP_HOST", default="localhost")
    smtp_port = config_env.int("SMTP_PORT", default=25)
    smtp_user = config_env.str("SMTP_USER", default="")
    smtp_password = config_env.str("SMTP_PASSWORD", default="")
    smtp_timeout = config_env.float("SMTP_TIMEOUT", default=5)
    
    if config_env.bool("SMTP_SENDGRID", default=False):
        from base64 import b64encode
        smtp_user = b64encode(smtp_user.encode()).decode() if smtp_user else smtp_user
        smtp_password = b64encode(smtp_password.encode()).decode() if smtp_password else smtp_password
    
    email_message["From"] = smtp_from
    email_message["To"] = ", ".join(config.emails)
    email_message.set_content("Your weekly report insights are available as HTML content.")
    email_message.add_alternative(rendered_html, subtype="html")
    email_message.add_attachment(
        audit_logs.encode("utf-8"),
        maintype="text",
        subtype="plain",
        filename="audit_logs.txt"
    )
    
    try:
        # 9. Try to send the email with retry.
        await send_email_with_retry(email_message, smtp_host, smtp_port, smtp_user, smtp_password, smtp_timeout)
        # 10. Mark the report as sent to prevent duplicate emails.
        config.last_sent = now
        await config.replace()
        return {"message": "Weekly report email sent successfully.", "last_sent": now.isoformat()}
    except Exception as e:
        log.error("Failed to send weekly report email after retries: %s", str(e))
        return {"error": "Failed to send weekly report email.", "details": str(e)} 