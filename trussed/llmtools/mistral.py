from openai import AsyncOpenAI

from ..models.llm import MistralOptions
from .openai import load_openai_models, http_client


def load_mistral(options: MistralOptions):
    client = AsyncOpenAI(
        base_url='https://api.mistral.ai/v1',
        api_key=options.api_key,
        http_client=http_client,
    )

    return load_openai_models(client.models)
