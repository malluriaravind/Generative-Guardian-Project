import httpx

from openai import AsyncOpenAI, APIStatusError, APITimeoutError
from openai.resources import AsyncModels

from ..models.llm import Llm, OpenAiOptions
from ..errors import ProviderConnectionError
from . import get_model_object


http_client = httpx.AsyncClient()


def load_openai(options: OpenAiOptions):
    client = AsyncOpenAI(
        api_key=options.api_key,
        http_client=http_client,
    )

    return load_openai_models(client.models)


async def load_openai_models(modelresource: AsyncModels):
    try:
        models = await modelresource.list()
    except APIStatusError as e:
        message = e.body.get('message') or str(e)
        raise ProviderConnectionError(message) from None
    except APITimeoutError as e:
        raise ProviderConnectionError(e.message) from None

    modelobjects: list[Llm.ModelObject] = []

    for i in models.data:
        modelobjects.append(get_model_object(i.id))

    return modelobjects
