import logging

from typing import Self, override
from openai import AsyncOpenAI
from httpx import URL

from .models.llm import OpenAICompatibleOptions


log = logging.getLogger(__name__)


class CustomAsyncOpenAI(AsyncOpenAI):
    authorization_header: str = 'Authorization'
    authorization_value: str | None = None
    url_mapper: dict[str, URL] | None = None

    @classmethod
    def from_options(cls, options: OpenAICompatibleOptions) -> Self:
        api_key = options.ensure_bearer()
        base_url = URL()

        raw_mapper: dict[str, str | None] = {
            '/chat/completions': options.completion_endpoint,
            '/embeddings': options.embedding_endpoint,
        }
        url_mapper: dict[str, URL] = {}

        for cannonical, endpoint in raw_mapper.items():
            if endpoint:
                url = URL(endpoint)
                url_mapper[cannonical] = url

                 # Infer the base URL, if possible
                if not base_url and url.path.endswith(cannonical):
                    base_path = url.path.partition(cannonical)[0]
                    base_url = url.copy_with(path=base_path)

        client = cls(
            base_url=base_url,
            api_key=api_key,
            default_headers=options.make_headers(),
            timeout=options.timeout,
        )

        client.url_mapper = url_mapper
        client.authorization_header = options.authorization_header or 'Authorization'
        client.authorization_value = options.authorization_value
        return client

    @property
    @override
    def auth_headers(self) -> dict[str, str]:
        if self.authorization_value:
            return {self.authorization_header: self.authorization_value}
        elif self.api_key:
            return {self.authorization_header: f'Bearer {self.api_key}'}
        else:
            return {}

    @override
    def _prepare_url(self, url: str) -> URL:
        merge_url = URL(url)

        if merge_url.is_absolute_url:
            return merge_url

        if self.url_mapper:
            if mapped_url := self.url_mapper.get(merge_url.path):
                return mapped_url

            elif self.base_url.host:
                return super()._prepare_url(url)

        raise ValueError('Unable to prepare URL: {url}')
