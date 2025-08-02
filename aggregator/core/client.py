import ujson
import logging

from typing import *
from dataclasses import dataclass
from contextvars import ContextVar
from aiohttp import ClientSession, ClientResponse, DummyCookieJar

logger = logging.getLogger(__name__)


@dataclass
class Payload:
    body: dict | None
    response: ClientResponse

    def raw_headers(self, *prefixes: tuple):
        for header, value in self.response.raw_headers:
            if any(map(header.lower().startswith, prefixes)):
                yield header, value


class RawAPIClient:
    prefix: str
    session: ClientSession

    def __init__(self, prefix: str):
        taskName = 'client__init__'
        self.prefix = prefix
        self.session = ClientSession(
            json_serialize=ujson.dumps, cookie_jar=DummyCookieJar()
        )
        logger.info(f"Initialized RawAPIClient with prefix: {self.prefix}")

    def prepare(self, path: str, token: str):
        taskName = 'client_prepare'
        url = self.prefix + path
        headers = {'Authorization': 'Bearer ' + token}
        logger.debug(f"Prepared URL: {url} with headers: {headers}")
        return url, headers

    async def post(self, path: str, json: Any = None, query: dict = None, token=''):
        taskName = 'client_post'
        url, headers = self.prepare(path, token)
        logger.info(f"Sending POST request to {url} with payload: {json} and query: {query}")

        try:
            async with self.session.post(
                url, json=json, params=query, headers=headers
            ) as response:
                logger.debug(f"[{taskName}] Received response status: {response.status} for POST request to {url}")
                payload = Payload(await response.json(loads=ujson.loads), response)
                return payload
        except Exception as e:
            logger.error(f"POST request to {url} failed with exception: {e}")
            raise

    async def get(self, path: str, query: dict = None, token: str = ''):
        taskName = 'client_get'
        url, headers = self.prepare(path, token)
        logger.info(f"Sending GET request to {url} with query: {query}")

        try:
            async with self.session.get(
                url, params=query, headers=headers
            ) as response:
                logger.debug(f"[{taskName}] Received response status: {response.status} for GET request to {url}")
                payload = Payload(await response.json(loads=ujson.loads), response)
                return payload
        except Exception as e:
            logger.error(f"GET request to {url} failed with exception: {e}")
            raise
