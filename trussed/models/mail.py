from datetime import datetime, timedelta, UTC
from pydantic import Field, EmailStr
from pymongo import IndexModel
from beanie import UpdateResponse
from typing import *

from ..pydantic import TzDatetime
from . import AppDocument


MailKey = Literal['alert']


class Mail(AppDocument):
    key: str
    emails: list[EmailStr]
    subject: str
    template_body: dict
    template_name: str

    created_at: TzDatetime = Field(default_factory=lambda: datetime.now(UTC))
    send_at: TzDatetime = Field(default=TzDatetime.min)
    attempts: int = Field(default=0)

    class Settings:
        indexes = [
            IndexModel('key', unique=True),
            IndexModel('send_at'),
        ]

    async def enqueue(self):
        return await self.find_one({'key': self.key}).upsert(
            {
                '$set': {
                    'emails': self.emails,
                    'template_body': self.template_body,
                    'template_name': self.template_name,
                }
            },
            on_insert=self,
        )

    @classmethod
    async def next(cls, retry_after=60, retry_max=5) -> Self | None:
        now = datetime.now(UTC)
        find = cls.find_one(cls.send_at < now, cls.attempts < retry_max)

        # If fail has occurred after return,
        # make the next attempt after N seconds, not immediately
        return await find.update_one(
            {
                '$set': {cls.send_at: now + timedelta(seconds=retry_after)},
                '$inc': {cls.attempts: 1},
            },
            response_type=UpdateResponse.NEW_DOCUMENT,
        )
