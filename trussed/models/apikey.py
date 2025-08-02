from hashlib import sha256
from bson import ObjectId

from pydantic import Field, BaseModel, EmailStr, model_validator, computed_field
from pydantic_extra_types.color import Color
from datetime import datetime, timedelta
from pymongo import IndexModel
from beanie import PydanticObjectId, UpdateResponse
from typing import *

from ..errors import AppKeyAlreadyExistError
from ..utils.color import object_id_color
from ..utils.tokengenerator import tokengetter
from .systag import SysTag

from . import AppDocument, BaseCreateModel, BaseUpdateModel, Unscoped


RatePeriod = Literal['second', 'minute', 'hour']

rate_seconds: dict[RatePeriod, int] = {
    'second': 1,
    'minute': 60,
    'hour': 3600,
}


class LoggerParams(TypedDict):
    logger: str
    level: int


class Loggable:
    log_enable: bool | None = None
    log_duration_hours: float | None = None
    log_until: datetime | None = None
    log_retention_hours: float | None = None
    log_level: int | None = None
    log_params: list[LoggerParams] | None = None
    log_reqres: bool | None = None

    def configure_logging_options(self):
        self.log_params = []

        if self.log_level:
            for i in ('root', 'uvicorn.access', 'uvicorn.error'):
                self.log_params.append(LoggerParams(logger=i, level=self.log_level))

        if not self.log_until:
            if self.log_duration_hours:
                delta = timedelta(hours=self.log_duration_hours)
                self.log_until = datetime.utcnow() + delta
            else:
                self.log_until = datetime.max
 
        if self.log_reqres:
            self.log_params.append(LoggerParams(logger='tc.reqres', level=10))


class Apikey(AppDocument, Loggable):
    scoped_context_enable: ClassVar[bool] = True

    ownership_id: PydanticObjectId | None = None
    name: str | None = None
    color: Color | None = None
    api_key_hash: str
    api_key_suffix: str

    llm_access: list[PydanticObjectId] = Field(default_factory=list)
    pool_access: list[PydanticObjectId] = Field(default_factory=list)
    policies: list[PydanticObjectId] = Field(default_factory=list)

    tags: list[str] | None = None
    system_tags: list[SysTag] | None = None

    log_prompts: bool = False
    log_completions: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None
    expires_at: datetime | None = None
    used_at: datetime | None = None
    unbudgeted_until: datetime | None = None
    created_by: str | None = None

    rate_requests: int | None = None
    rate_period: RatePeriod | None = None
    max_prompt_tokens: int | None = None

    randtoken = staticmethod(tokengetter(length=48))

    class Settings:
        indexes = [
            IndexModel(['scopes']),
            IndexModel('api_key_hash', unique=True),
        ]

    def rate(self) -> float:
        if self.rate_requests and self.rate_period:
            return rate_seconds[self.rate_period] / self.rate_requests

        return 0

    @classmethod
    @Unscoped()
    def purge_llm(cls, llm_id: ObjectId):
        return cls.remove_array_element(llm_access=llm_id)

    @classmethod
    @Unscoped()
    def purge_pool(cls, pool_id: ObjectId):
        return cls.remove_array_element(pool_access=pool_id)

    @classmethod
    def remove_array_element(cls, **find):
        return cls.find_many(find).update_many(
            {
                '$pull': find,
                '$set': {'updated_at': datetime.utcnow()},
            }
        )

    @classmethod
    def set_updated_at(cls, *args):
        return cls.find_many(*args).update_many(
            {
                '$set': {'updated_at': datetime.utcnow()},
            }
        )

    @classmethod
    def get_by_key(cls, key: str, update_usage=True):
        q = cls.find_one(Apikey.api_key_hash == sha256(key.encode()).hexdigest())

        if update_usage:
            q = q.update_one(
                {
                    '$set': {
                        'used_at': datetime.utcnow(),
                    }
                },
                response_type=UpdateResponse.NEW_DOCUMENT,
            )

        return q

    @staticmethod
    def error_from_mongo(e):
        if api_key_hash := e.details['keyValue'].get('api_key_hash'):
            return AppKeyAlreadyExistError()

        return e

    model_validator(mode='after')
    def ensure_fields(self):
        if not self.color or self.color == '#83aee6':
            self.color = object_id_color(self.id)

        if not self.name:
            self.name = f'@{self.api_key_suffix}'

        return self


class ApikeyCreateDto(BaseCreateModel, Loggable):
    name: str
    color: Color | None = None
    llm_access: list[PydanticObjectId]
    pool_access: list[PydanticObjectId]
    policies: list[PydanticObjectId]
    expires_at: datetime | None = None

    tags: list[str] | None = None

    key: str | None = None
    api_key_hash: str | None = None
    api_key_suffix: str | None = None

    rate_requests: int | None = None
    rate_period: RatePeriod | None = None
    max_prompt_tokens: int | None = None

    @model_validator(mode='after')
    def ensure_key_hash(self):
        self.key = self.key or Apikey.randtoken()
        self.api_key_hash = sha256(self.key.encode()).hexdigest()
        self.api_key_suffix = self.key[-6:]

        return self
    
    @model_validator(mode='after')
    def ensure_logging(self):
        self.configure_logging_options()
        return self


class ApikeyUpdateDto(BaseUpdateModel, Loggable):
    name: str | None = None
    color: Color | None = None
    llm_access: List[PydanticObjectId] | None = None
    pool_access: list[PydanticObjectId] | None = None
    policies: list[PydanticObjectId] | None = None

    expires_at: datetime | None = None
    updated_at: datetime | None = None

    tags: list[str] | None = None

    key: str | None = None
    api_key_hash: str | None = None
    api_key_suffix: str | None = None

    rate_requests: int | None = None
    rate_period: RatePeriod | None = None
    max_prompt_tokens: int | None = None

    @model_validator(mode='after')
    def ensure_fields(self):
        # Important for cache invalidation
        self.updated_at = datetime.utcnow()
        return self

    @model_validator(mode='after')
    def ensure_key_hash(self):
        if self.key is not None:
            self.api_key_hash = sha256(self.key.encode()).hexdigest()
            self.api_key_suffix = self.key[-6:]
            self.key = None

        return self

    @model_validator(mode='after')
    def ensure_logging(self):
        self.configure_logging_options()
        return self


class ApikeyKeyDto(BaseModel):
    key: str


class ApikeyOutDto(Apikey): ...

