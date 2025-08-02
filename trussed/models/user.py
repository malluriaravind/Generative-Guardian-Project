# fmt: off
import os
import struct
import time
import asyncio
import random
import logging
import jwt

from jwt.exceptions import PyJWTError as JWTError  # noqa: F401

from base64 import urlsafe_b64encode
from pymongo import IndexModel
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from pydantic import BaseModel, Field, computed_field
from bson import ObjectId
from beanie.odm.fields import PydanticObjectId
from passlib.hash import pbkdf2_sha256
from typing import *

from . import AppDocument, BaseCreateModel, BaseUpdateModel, Scopes


log = logging.getLogger(__name__)

@dataclass(slots=True)
class JWT:
    jti: ObjectId
    sub: ObjectId
    exp: datetime

    @classmethod
    def new(cls, uid: ObjectId, minutes: int, jti: ObjectId | None = None):
        """
        Generate a new JWT instance.
        By default, our JWT IDs are ordered by their expiration time, not creation time

        :param uid: ObjectId - the unique user ID
        :param minutes: int - the number of minutes until expiration
        :param jti: ObjectId | None - the JWT ID, or new one will be generated
        :return: instance of the class
        """
        exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        jti = jti or cls.new_jti(int(exp.timestamp()))
        return cls(jti=jti, sub=uid, exp=exp)

    @staticmethod
    def new_jti(timestamp: int):
        return ObjectId(struct.pack('>i8s', timestamp, os.urandom(8)))
    
    @staticmethod
    def new_blank_jti(timestamp: int):
        return ObjectId(struct.pack('>i8x', timestamp))

    @staticmethod
    def infer_mask(jti: ObjectId):
        part = urlsafe_b64encode(b'{"jti":"%s"' % jti.binary.hex().encode())[20:-2]
        return part.decode()

    def encode(self, secret: str):
        claims = {'jti': str(self.jti), 'sub': str(self.sub), 'exp': self.exp}
        return jwt.encode(claims, key=secret, algorithm='HS256')

    @classmethod
    def decode(cls, token: str, secret: str):
        claims = jwt.decode(token, key=secret, algorithms=['HS256'])

        return cls(
            jti=ObjectId(claims['jti']),
            sub=ObjectId(claims['sub']),
            exp=datetime.fromtimestamp(claims['exp'], timezone.utc),
        )

class IssuedToken(BaseModel):
    jti: PydanticObjectId
    mask: str
    expires_at: datetime
    current: bool = False

    @classmethod
    def from_jti(cls, jti: ObjectId, current=False):
        return cls(
            jti=jti,
            mask=JWT.infer_mask(jti),
            expires_at=jti.generation_time,
            current=current
        )


class User(AppDocument):
    scoped_context_enable: ClassVar[bool] = True

    ownership_id: PydanticObjectId = Field(default_factory=PydanticObjectId)
    first_name: str
    last_name: str
    email: str
    created_by: Optional[str] = Field(default=None)
    created_at: str = Field(default_factory=lambda: datetime.now().strftime('%d-%b-%Y'))
    password_hash: str

    # A list of session token IDs (e.q. jti)
    tokens: list[PydanticObjectId] = Field(default_factory=list)

    is_root: bool = True
    roles: list[str] | None = None
    available_scopes: list[str] | None = None

    class Settings:
        indexes = [
            IndexModel(['scopes']),
            IndexModel('email', unique=True),
        ]

    @staticmethod
    def new_password_hash(password: str):
        return pbkdf2_sha256.hash(password)

    def set_password(self, password: str):
        self.password_hash = self.new_password_hash(password)
        return self

    def check_password(self, password: str):
        return pbkdf2_sha256.verify(password, self.password_hash)

    @classmethod
    async def jwt_login(cls, jwt: JWT, limit: int = 20):
        return await cls.find_one(cls.id == jwt.sub).update({
            '$push': {
                'tokens': {
                    '$each': [jwt.jti],
                    '$slice': limit,
                    '$sort': -1,
                }
            }
        })

    @classmethod
    def jwt_logout(cls, jwt: JWT):
        return cls.jti_logout(jwt.jti, jwt.sub)

    @classmethod
    async def jti_logout(cls, jti: ObjectId, uid: ObjectId):
        return await cls.find_one(cls.id == uid).update({
            '$pull': {
                'tokens': jti
            }
        })

    @classmethod
    async def jwt_logout_all(cls, jwt: JWT):
        return await cls.find_one(cls.id == jwt.sub).update({
            '$set': {
                'tokens': []
            }
        })

    @classmethod
    async def cleanup_expired_tokens(cls):
        jti = JWT.new_blank_jti(int(time.time()))
        await cls.find().update({
            '$pull': {
                'tokens': {'$lt': jti}
            }
        })

    @classmethod
    async def cleanup_expired_tokens_forever(cls, every=3600):
        while True:
            try:
                await cls.cleanup_expired_tokens()
            except Exception as e:
                log.exception(e)
            await asyncio.sleep(every + random.random())


class UserCreateDto(BaseCreateModel):
    first_name: str = Field(min_length=3)
    last_name: str = Field(min_length=3)
    email: str
    created_by: Optional[str] = Field(default=None)
    created_at: str = Field(default_factory=lambda: datetime.now().strftime('%d-%b-%Y'))
    password: str = Field(min_length=8)

    is_root: bool = False
    roles: list[str] = Field(default_factory=list)
    available_scopes: list[str] | None = None


class UserUpdateDto(BaseUpdateModel):
    first_name: str = Field(min_length=3)
    last_name: str = Field(min_length=3)
    email: str

    is_root: bool = False
    roles: list[str] = Field(default_factory=list)
    available_scopes: list[str] | None = None


class UserResponseDto(BaseModel, Scopes):
    first_name: str
    last_name: str
    email: str
    created_at: str

    is_root: bool = False
    roles: list[str] | None = None
    available_scopes: list[str] | None = None
    available_api_namespaces: list[str] | None = None

class UserLoginDto(BaseModel):
    email: str
    password: str = Field(min_length=8)
    rememberme: bool = False

class ChangeProfileDto(BaseModel):
    first_name: Optional[str] = Field(None, min_length=3, max_length=30)
    last_name: Optional[str] = Field(None, min_length=3, max_length=30)
    email: str | None = None

class ChangePasswordDto(BaseModel):
    old_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)

class UserEmailRequest(BaseModel):
    email: str

class AccountChangePasswordRequest(BaseModel):
    email: str
    newPassword: str = Field(min_length=8)

