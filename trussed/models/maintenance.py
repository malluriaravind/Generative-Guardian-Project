import logging
import asyncio
import random

from typing import *
from datetime import datetime

from pydantic import Field, computed_field
from pymongo import IndexModel

from . import AppDocument

log = logging.getLogger(__name__)
Appname = Literal['aggregator', 'control_panel'] | str


class Heartbeat(AppDocument):
    version: str
    appname: Appname
    hostname: str = ''
    addresses: list[str] = Field(default_factory=list)
    heartbeat_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        indexes = [
            IndexModel(['heartbeat_at'], expireAfterSeconds=70),
        ]
    
    @computed_field
    @property
    def reprversion(self) -> str:
        if self.hostname:
            return f'{self.version}@{self.hostname}'
        else:
            return self.version

    async def upsert(self):
        return await self.find_one(
            {
                'appname': self.appname,
                'version': self.version,
                'hostname': self.hostname,
            }
        ).upsert(
            {
                '$set': {
                    'heartbeat_at': self.heartbeat_at,
                },
            },
            on_insert=self,
        )

    async def heartbeat_forever(self, every=60):
        while True:
            try:
                self.heartbeat_at = datetime.utcnow()
                await self.upsert()
            except Exception as e:
                log.exception(e)

            await asyncio.sleep(every + random.random())
