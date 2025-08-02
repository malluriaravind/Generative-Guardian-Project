import logging
import litellm

from typing import TypedDict
from pydantic import BaseModel
from httpx import HTTPStatusError
from openai import APIError as OpenAiError

from ..openai import CustomAsyncOpenAI
from ..amlscore import ChatScoreClient, PromptScoreClient, EmbeddingScoreClient
from ..typedef.openai import ChatCompletionMessage

from ..models.llm import Llm, LlmProvider
from ..errors import ProviderConnectionError, ProviderIsNotReadyError


from .openai import load_openai, OpenAiOptions
from .azure import load_azure, AzureOptions
from .bedrock import load_bedrock, BedrockOptions
from .mistral import load_mistral, MistralOptions
from .gemini import load_gemini, GeminiOptions
from .anthropic import load_anthropic, AnthropicOptions
from .openaicompatible import load_openai_compat, OpenAICompatibleOptions
from .amlscore import load_amlchatscore,load_amlpromptscore, load_amlembeddingscore, CustomProviderOptions


logging.getLogger('LiteLLM').setLevel(logging.WARNING)


class TestCompletion(TypedDict):
    messages: list[ChatCompletionMessage]
    max_tokens: int
    temperature: float

class TestEmbedding(TypedDict):
    input: str | list[str] | list[int] | list[list[int]]


async def load_provider(provider: LlmProvider, options: BaseModel):
    print('!!!', options)
    match provider:
        case 'OpenAI':
            options = OpenAiOptions.model_validate(options, from_attributes=True)
            return await load_openai(options)
        case 'Azure':
            options = AzureOptions.model_validate(options, from_attributes=True)
            return await load_azure(options)
        case 'Bedrock':
            options = BedrockOptions.model_validate(options, from_attributes=True)
            return await load_bedrock(options)
        case 'Gemini':
            options = GeminiOptions.model_validate(options, from_attributes=True)
            return await load_gemini(options)
        case 'Mistral':
            options = MistralOptions.model_validate(options, from_attributes=True)
            return await load_mistral(options)
        case 'Anthropic':
            options = AnthropicOptions.model_validate(options, from_attributes=True)
            return await load_anthropic(options)

        case 'OpenAICompatible':
            options = OpenAICompatibleOptions.model_validate(
                options, from_attributes=True
            )
            return await load_openai_compat(options)

        case 'AzureMLChatScore':
            options = CustomProviderOptions.model_validate(
                options, from_attributes=True
            )
            return await load_amlchatscore(options)

        case 'AzureMLPromptScore':
            options = CustomProviderOptions.model_validate(
                options, from_attributes=True
            )
            return await load_amlpromptscore(options)

        case 'AzureMLEmbeddingScore':
            options = CustomProviderOptions.model_validate(
                options, from_attributes=True
            )
            return await load_amlembeddingscore(options)

        case _:
            return []


testkwargs = TestCompletion(
    messages=[{'role': 'user', 'content': 'Hi!'}],
    max_tokens=1,
    temperature=0,
)

testembeddingkwargs = TestEmbedding(
    input=['Hello!']
)


async def test_llm(llm: Llm, assign_status=True):
    if assign_status:
        status = None
    else:
        status = llm.status

    if not llm.models:
        llm.status = status or 'Pending'
        raise ProviderIsNotReadyError('Provider does not have configured models')

    model = llm.models[0]['name']

    try:
        await test_provider(llm.provider, llm.get_options(), model=model)
        llm.status = status or 'Connected'
        return

    except OpenAiError as e:
        message = getattr(e.__context__, 'message', str(e))
    
    except HTTPStatusError as e:
        message = f'{e.response.text.strip() or e}'

    except Exception as e:
        message = f'{type(e).__name__} {e}'

    llm.status = status or 'Error'
    raise ProviderConnectionError(f'{llm.provider}/{model}: {message}') from None


async def test_provider(provider: LlmProvider, options: BaseModel, **kwargs):
    match provider:
        case 'OpenAI':
            return await test_openai(options, **kwargs)
        case 'Azure':
            return await test_azure(options, **kwargs)
        case 'Mistral':
            return await test_mistral(options, **kwargs)
        case 'Bedrock':
            await test_bedrock(options, **kwargs)
        case 'Gemini':
            return await test_gemini(options, **kwargs)
        case 'Anthropic':
            return await test_anthropic(options, **kwargs)
        case 'OpenAICompatible':
            return await test_openai_compat(options, **kwargs)
        case 'AzureMLChatScore':
            return await test_amlchatscore(options, **kwargs)
        case 'AzureMLPromptScore':
            return await test_amlpromptscore(options, **kwargs)
        case 'AzureMLEmbeddingScore':
            return await test_amlembeddingscore(options, **kwargs)
        case _:
            raise ProviderConnectionError(f'Provider type "{provider}" is not defined')


async def test_openai(options: BaseModel, model='gpt-3.5-turbo'):
    options = OpenAiOptions.model_validate(options, from_attributes=True)

    return await litellm.acompletion(
        model='openai/' + model,
        api_key=options.api_key,
        timeout=options.timeout,
        **testkwargs,
    )


async def test_mistral(options: BaseModel, model='mistral-tiny'):
    options = MistralOptions.model_validate(options, from_attributes=True)

    return await litellm.acompletion(
        model='mistral/' + model,
        api_key=options.api_key,
        timeout=options.timeout,
        **testkwargs,
    )


async def test_azure(options: BaseModel, model=''):
    options = AzureOptions.model_validate(options, from_attributes=True)

    return await litellm.acompletion(
        api_base=options.endpoint,
        api_version=options.version,
        api_key=options.api_key,
        model='azure/' + options.deployment,
        timeout=options.timeout,
        **testkwargs,
    )


async def test_bedrock(options: BaseModel, model='meta.llama2-13b-chat-v1'):
    options = BedrockOptions.model_validate(options, from_attributes=True)

    def invoke(model: str):
        return litellm.acompletion(
            aws_secret_access_key=options.access_key,
            aws_access_key_id=options.access_key_id,
            aws_region_name=options.region,
            model='bedrock/' + model,
            timeout=options.timeout,
            **testkwargs,
        )

    try:
        return await invoke(model)
    except Exception as e:
        prefix = options.region_model_prefix
    
        if 'ID or ARN of an inference profile' in str(e) and prefix:
            return await invoke(options.region_model_prefix + model)

        raise


async def test_gemini(options: BaseModel, model='gemini-pro'):
    options = GeminiOptions.model_validate(options, from_attributes=True)

    return await litellm.acompletion(
        model='gemini/' + model,
        api_key=options.api_key,
        timeout=options.timeout,
        **testkwargs,
    )


async def test_anthropic(options: BaseModel, model='claude-instant-1.2'):
    options = AnthropicOptions.model_validate(options, from_attributes=True)

    return await litellm.acompletion(
        model='anthropic/' + model,
        api_key=options.api_key,
        timeout=options.timeout,
        **testkwargs,
    )


async def test_openai_compat(options: BaseModel, model='gpt-3.5-turbo'):
    options = OpenAICompatibleOptions.model_validate(options, from_attributes=True)
    client = CustomAsyncOpenAI.from_options(options)

    return await litellm.acompletion(
        model='openai/' + model,
        client=client,
        timeout=options.timeout,
        **testkwargs,
    )


async def test_amlchatscore(options: BaseModel, model='*'):
    options = CustomProviderOptions.model_validate(options, from_attributes=True)
    client = ChatScoreClient.from_options(options)

    return await client.chat_completion(model=model, **testkwargs)


async def test_amlpromptscore(options: BaseModel, model='*'):
    options = CustomProviderOptions.model_validate(options, from_attributes=True)
    client = PromptScoreClient.from_options(options)

    return await client.chat_completion(model=model, **testkwargs)


async def test_amlembeddingscore(options: BaseModel, model='*'):
    options = CustomProviderOptions.model_validate(options, from_attributes=True)
    client = EmbeddingScoreClient.from_options(options)

    return await client.embedding(model=model, **testembeddingkwargs)


