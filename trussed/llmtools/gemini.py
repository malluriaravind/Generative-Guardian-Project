from google.generativeai.client import _ClientManager
from google.api_core.exceptions import GoogleAPICallError

from ..models.llm import Llm, GeminiOptions
from ..errors import ProviderConnectionError
from . import get_model_object


def load_gemini(options: GeminiOptions):
    client_manager = _ClientManager()
    client_manager.configure(api_key=options.api_key)
    client = client_manager.get_default_client('model_async')

    return load_gemini_models(client)


async def load_gemini_models(client):
    try:
        models = await client.list_models()
    except GoogleAPICallError as e:
        message = (e.message or str(e)).capitalize()
        raise ProviderConnectionError(message) from None

    modelobjects: list[Llm.ModelObject] = []

    async for i in models:
        name = i.name.rsplit('/', 1)[-1]
        modelobjects.append(get_model_object(name))

    return modelobjects
