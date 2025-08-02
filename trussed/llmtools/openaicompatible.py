from httpx import AsyncClient, URL

from ..openai import CustomAsyncOpenAI
from ..models.llm import OpenAICompatibleOptions
from ..errors import ProviderConnectionError


http_client = AsyncClient()


async def load_openai_compat(options: OpenAICompatibleOptions):
    client = CustomAsyncOpenAI.from_options(options)

    return []
