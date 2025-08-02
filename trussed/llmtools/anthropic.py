import httpx

from anthropic import AsyncAnthropic, APIStatusError, APITimeoutError

from ..models.llm import Llm, AnthropicOptions
from ..errors import ProviderConnectionError
from . import get_known_models


http_client = httpx.AsyncClient()


async def load_anthropic(options: AnthropicOptions):
    client = AsyncAnthropic(
        api_key=options.api_key,
        http_client=http_client,
        timeout=5,
    )

    try:
        await client.messages.create(
            model='claude-instant-1.2',
            max_tokens=100,
            messages=[{'role': 'user', 'content': 'Hi!'}],
        )

    except APIStatusError as e:
        if e.status_code in (401, 403):
            message = e.body.get('error', {}).get('message') or str(e)
            raise ProviderConnectionError(message) from None

    except APITimeoutError as e:
        raise ProviderConnectionError(e.message) from None

    # Anthropic does't have an API to list models
    return [*get_known_models('Anthropic').values()]
