import os
import logging
import asyncio
import random

from pydantic import BaseModel, model_validator
from pymongo import IndexModel
from typing import *

from ..pydantic import mask
from ..utils.logging.ctx import ContextualLogger
from . import AppDocument


log = logging.getLogger(__name__)


class SMTPVars(BaseModel):
    SMTP_SENDGRID: bool = False

    SMTP_FROM: str | None = None
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None

    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None

    SMTP_TIMEOUT: float = 5
    SMTP_DELAY: int = 0
    SMTP_RETRY_AFTER: int = 300
    SMTP_RETRY_MAX: int = 3

    SMTP_TEST_EMAIL: str | None = None


class SMTPRequiredVars(SMTPVars):
    SMTP_FROM: str
    SMTP_HOST: str
    SMTP_PORT: int


# Hint for external agent
CfgType = Literal[
    'string',
    'number',
    'boolean',
    'submit',
    'role_mappings',
    'default_sso_roles',
]


class DescriptiveValue(TypedDict):
    name: str
    value: str


class BaseCfg(BaseModel):
    onchange_callbacks: ClassVar[dict[str, Callable[[str | None], None]]] = {}

    name: str
    value: str | None = None
    description: str | None = ""
    builtin: bool | None = False
    secure: bool | None = False
    type: CfgType | str | None = "string"
    one_of: list[DescriptiveValue] | None = None
    submit_url: str | None = None
    group: str | None = "Global"
    order: float | None = None
    extra: dict[str, Any] | None = None

    def on_change(self, f: Callable[[str | None], None]) -> Self:
        self.onchange_callbacks[self.name] = f
        return self

class Cfg(AppDocument, BaseCfg):
    class Settings:
        indexes = [
            IndexModel(['name']),
            IndexModel(['order']),
        ]

    async def upsert(self, update: tuple[str, ...]):
        return await self.find_one({"name": self.name}).upsert(
            {
                "$set": {k: v for k in update if (v := getattr(self, k)) is not None},
            },
            on_insert=self,
        )

    @classmethod
    async def upsert_builtins(cls):
        on_update: tuple[str, ...] = (
            cls.description,
            cls.builtin,
            cls.secure,
            cls.type,
            cls.one_of,
            cls.group,
            cls.order,
            cls.extra,
        )

        for i, var in enumerate(builtin_cfg_variables):
            cfg = cls.model_validate(var, from_attributes=True)

            if cfg.order is None:
                cfg.order = i

            await cfg.upsert(on_update)

    @classmethod
    async def export_to_environ(cls, *query: dict | bool):
        if not query:
            query = ({"builtin": True},)

        async for cfg in cls.find(*query):
            callback = cls.onchange_callbacks.get(cfg.name)

            if callback and cfg.value != os.environ.get(cfg.name):
                try:
                    callback(cfg.value)
                    log.warning(
                        'Succesfully triggered callback for %s = %r',
                        cfg.name,
                        cfg.value,
                    )
                except Exception as e:
                    log.exception(
                        'Error in callback for %s = %r: %s',
                        cfg.name,
                        cfg.value,
                        e,
                    )

            if cfg.value:
                os.environ[cfg.name] = cfg.value
            else:
                os.environ.pop(cfg.name, None)

    @classmethod
    async def export_to_environ_forever(cls, every=5):
        while True:
            try:
                await cls.export_to_environ()
            except Exception as e:
                log.exception(e)

            await asyncio.sleep(every + random.random())


class CfgOut(BaseCfg):
    @model_validator(mode="after")
    def mask(self):
        if self.secure:
            self.value = mask(self.value)

        return self


class UpdateCfg(BaseModel):
    name: str
    value: str | None = None
    description: str | None = None
    secure: bool | None = None
    type: CfgType | None = None
    group: str | None = None
    builtin: Literal[False] = False
    extra: dict[str, Any] | None = None

    @model_validator(mode="after")
    def nullify_mask(self):
        # Ignore already masked value
        if self.value and mask(self.value) == self.value:
            self.value = None

        return self


def on_logging_level_change(value: str | None):
    level = int(value or 20)
    ContextualLogger.default_levels['root'] = level
    ContextualLogger.default_caches.clear()
    logging.getLogger().setLevel(level)


builtin_cfg_variables = [
    # General
    BaseCfg(
        builtin=True,
        name='DOMAIN',
        value='',
        group='General',
        description='Domain of current service',
    ),
    BaseCfg(
        builtin=True,
        name='IS_HTTPS',
        value='false',
        type='boolean',
        group='General',
        description='Is https used in service',
    ),
    BaseCfg(
        builtin=True,
        name='ENABLE_SECURITY_POLICY_CONTROL',
        value='true',
        type='boolean',
        group='General',
        description='Enable (or disable) the security policy controls',
    ),
    BaseCfg(
        builtin=True,
        name='PROVIDER_TIMEOUT',
        value='5',
        type='number',
        group='General',
        description='Default provider connection timeout, seconds (DEPRECATED)',
    ),
    # Logging
    BaseCfg(
        builtin=True,
        name='LOGGING_LEVEL',
        value='20',
        type='number',
        one_of=[
            {'value': '10', 'name': 'DEBUG'},
            {'value': '20', 'name': 'INFO'},
            {'value': '30', 'name': 'WARNING'},
            {'value': '40', 'name': 'ERROR'},
            {'value': '50', 'name': 'CRITICAL'},
        ],
        group='Logging',
        description='Threshold of the root logger. A lower value means a more verbose and noisy log. Levels: 10 (DEBUG), 20 (INFO), 30 (WARNING), 40 (ERROR), 50 (CRITICAL). Default is 20 (INFO)',
    ).on_change(
        on_logging_level_change,
    ),
    BaseCfg(
        builtin=True,
        name='LOGGING_RETENTION_HOURS',
        value='24',
        type='number',
        group='Logging',
        description='Lifetime of log entry, hours',
    ),
    BaseCfg(
        builtin=True,
        name='LOGGING_AUDIT_RETENTION_DAYS',
        value='180',
        type='number',
        group='Logging',
        description='Lifetime of compliance/audit trail records, days. Applies to "tc.reqres" logger, which logs requests and responses to/from LLM',
    ),
    # SMTP
    BaseCfg(
        builtin=True,
        name='SMTP_SENDGRID',
        value='false',
        type='boolean',
        description='SendGrid compatibility mode (encode the credentials to base64 when sending)',
        group='SMTP',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_FROM',
        value='',
        description='Sender name, e.g. alerts@trussed.ai or Trussed AI <alerts@trussed.ai>',
        group='SMTP',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_HOST',
        value='',
        group='SMTP',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_PORT',
        value='',
        type='number',
        group='SMTP',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_USER',
        value='',
        group='SMTP',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_PASSWORD',
        value='',
        group='SMTP',
        secure=True,
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_DELAY',
        value='0',
        type='number',
        group='SMTP',
        description='Delay between email sends, seconds',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_TIMEOUT',
        value='5',
        type='number',
        group='SMTP',
        description='SMTP connection timeout, seconds',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_RETRY_AFTER',
        value='300',
        type='number',
        group='SMTP',
        description='Retry a failed email after, seconds',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_RETRY_MAX',
        value='3',
        type='number',
        group='SMTP',
        description='Maximum number of retries',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_TEST_EMAIL',
        value='',
        description='Recepient to which test emails will be sent',
        group='SMTP',
    ),
    BaseCfg(
        builtin=True,
        name='SMTP_TEST_NOW',
        value='',
        type='submit',
        submit_url='/api/cfg/actions/smtp-validate',
        description='Test SMTP now',
        group='SMTP',
    ),
    # Control Plane Tweaks
    BaseCfg(
        builtin=True,
        name='RESTRICT_API_REFERENCE',
        value='true',
        type='boolean',
        group='Control Plane Tweaks',
        description='Specifies whether API documentation (/api/reference, /api/database) should be accessible for authenticated users only',
    ),
    # Data Plane Tweaks
    BaseCfg(
        builtin=True,
        name='TRF_LOCAL_TOKENIZERS_ONLY',
        value='false',
        type='boolean',
        group='Data Plane Tweaks',
        description='Allow local tokenizers only, forbid downloads',
    ),
    BaseCfg(
        builtin=True,
        name='CHECK_FREE_RAM',
        value='true',
        type='boolean',
        group='Data Plane Tweaks',
        description='Allow checking free RAM before initializing heavy resources (e.g. NLP models)',
    ),
    BaseCfg(
        builtin=True,
        name='RESPONSE_WITH_SPEND',
        value='true',
        type='boolean',
        group='Data Plane Tweaks',
        description='Add budget and cost details to API responses',
    ),
    # SSO
    BaseCfg(
        builtin=True,
        name='ENTITY_ID',
        value='',
        group='Single Sign-On',
        description='Entity id url',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_URL',
        value='',
        group='Single Sign-On',
        description='Url to sso',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_CERTIFICATE',
        value='',
        group='Single Sign-On',
        description='sso certificate',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_EMAIL_FIELD_NAME',
        value='email',
        group='Single Sign-On',
        description='Email field name in SSO request data',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_FIRST_NAME_FIELD_NAME',
        value='firstName',
        group='Single Sign-On',
        description='First name field name in SSO request data. Leave it as is if there is no first name',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_LAST_NAME_FIELD_NAME',
        value='lastName',
        group='Single Sign-On',
        description='Last name field name in SSO request data. Leave it as is if there is no last name',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_ACCOUNT_ENABLED',
        value='false',
        type='boolean',
        group='Single Sign-On',
        description='Allow sso only for in-system account',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_ROLE_ENABLED',
        value='false',
        type='boolean',
        group='Single Sign-On',
        description='If you need role enabled for sso to restrict by role',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_ROLE_FIELD_NAME',
        value='role',
        group='Single Sign-On',
        description='SSO role field name from sso attribute',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_ROLE_VALUES',
        value='',
        group='Single Sign-On',
        description='COMMA SEPARATED SSO roles that allowed to enter the system',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_ROLE_VALUES',
        value='',
        group='Single Sign-On',
        description='COMMA SEPARATED SSO roles that allowed to enter the system',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_ROLE_MODE',
        value='all_of',
        one_of=[
            {'value': 'all_of', 'name': 'All roles must be in user profile'},
            {'value': 'one_of', 'name': 'At least one of roles must be in user profile'},
        ],
        group='Single Sign-On',
        description='COMMA SEPARATED SSO roles that allowed to enter the system',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_ROLE_MAPPINGS',
        type='role_mappings',
        group='Single Sign-On',
        description='SSO role -> internal role mapping',
    ),
    BaseCfg(
        builtin=True,
        name='SSO_DEFAULT_ROLES',
        type='default_sso_roles',
        group='Single Sign-On',
        description='Default roles',
    ),
]
