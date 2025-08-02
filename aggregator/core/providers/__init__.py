import logging
import attrs
import litellm
import core.state

from typing import *
from pydantic import Field
from dataclasses import dataclass
from datetime import datetime
from hashlib import blake2s
from abc import ABC, abstractmethod

from litellm.utils import ModelResponse, EmbeddingResponse, CustomStreamWrapper

from trussed.models.apikey import Apikey
from trussed.models.systag import extract_tags
from trussed.models.usage import PolicyEvent, Usage, UsageMetadata
from trussed.typedef.amlscore import ScoreChatPayload, ScorePromptPayload, ScoreEmbeddingPayload
from trussed.typedef.openai import ChatCompletionCreate, ChatCompletionMessage
from trussed.utils.time import CumulativeTimeIt
from trussed.utils.asgi import reqvars

from ..modelpool import ModelPoolDict
from ..spendresponse import set_cost_details
from .base import BaseProvider, ModelInfo

from core import env
from core.errors import (
    ApiException,
    BaseApiException,
    PromptLimitError,
    ProviderError,
    UnlistedModelError,
    UnknownProviderError,
    UnbudgetedLlmError,
    InstantApiResponse,
)


log = logging.getLogger(__name__)
logging.getLogger('LiteLLM').setLevel(logging.WARNING)
logging.getLogger('httpx').setLevel(logging.WARNING)
litellm.drop_params = True

StreamResponse = CustomStreamWrapper

CallName = Literal['completion']

GenericHook = Callable[['Context', dict], Callable]
CompletionHook = Callable[['Context', ChatCompletionCreate], Callable]
EmbeddingHook = GenericHook


@attrs.define(eq=False)
class BaseHook:
    name: str

    async def on_completion(self, ctx: 'Context', body: ChatCompletionCreate):
        async def on_return(response: ModelResponse | Any):
            return response

        return on_return

    async def on_embedding(self, ctx: 'Context', body: dict):
        async def on_return(response):
            return response

        return on_return
    
    def __str__(self):
        return self.name


@attrs.define
class Hooks:
    instances: tuple[BaseHook, ...] = ()
    completion: tuple[CompletionHook, ...] = ()
    embedding: tuple[EmbeddingHook, ...] = ()

    def add(self, hook: BaseHook):
        instance: BaseHook | None = None

        if type(hook).on_completion is not BaseHook.on_completion:
            self.completion += (hook.on_completion,)
            instance = hook

        if type(hook).on_embedding is not BaseHook.on_embedding:
            self.embedding += (hook.on_embedding,)
            instance = hook
        
        if instance is not None:
            self.instances += (instance,)

        return self

    def merge(self, other: Self):
        self.instances += other.instances
        self.completion += other.completion
        self.embedding += other.embedding
        return self


def find_first_exception[T: Exception](e: Exception, *bases: type[T]) -> T | None:
    """
    Find the first exception of a given type in the exception chain.
    The helper is written mainly for terrible LiteLLM exceptions

    :param e: The current exception being handled
    :param base: The base exception type to search for
    :return: The first exception of the given type found in the exception chain
    """
    candidate = None

    while e:
        if isinstance(e, bases):
            candidate = e

        e = e.__context__

    return candidate


class WithModelUsage(Protocol):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class UsageRecord(Usage):
    def set_error(self, e: Exception) -> Self:
        self.is_error = 1

        if isinstance(e, ApiException):
            self.error = e.response_body['error']

            if isinstance(e, ProviderError):
                self.error['http_code'] = e.http_code
        else:
            self.error = {
                'message': repr(e),
                'type': 'server_error',
                'is_internal': True,
            }

        return self

    def set_model_usage(self, usage: WithModelUsage, modelinfo: 'ModelInfo') -> Self:
        self.prompt_tokens = usage.prompt_tokens
        self.completion_tokens = usage.completion_tokens
        self.total_tokens = usage.total_tokens

        self.prompt_cost = usage.prompt_tokens * modelinfo.price_input / 1000
        self.completion_cost = usage.completion_tokens * modelinfo.price_output / 1000
        self.total_cost = self.prompt_cost + self.completion_cost

        return self


class Provider(BaseProvider):
    def invoke(self, ctx: 'Context', callname: CallName, **kwargs) -> Awaitable:
        log.info('Invoke %s provider: %s', self.llm.provider, self.llm.name)
        now = datetime.utcnow()
        method = getattr(self, callname)

        if self.llm.unbudgeted_until and self.llm.unbudgeted_until > now:
            raise UnbudgetedLlmError(delta=self.llm.unbudgeted_until - now)

        if max_prompt_tokens := ctx.apikey.max_prompt_tokens:
            if 'messages' in kwargs:
                for i in cast(list[ChatCompletionMessage], kwargs['messages']):
                    if len(i['content'].split()) / 0.75 > max_prompt_tokens:
                        raise PromptLimitError(limit=max_prompt_tokens)

        return method(ctx, **kwargs)


    async def completion(self, ctx: 'Context', **kwargs: Unpack[ChatCompletionCreate]): ...


class LiteLlmTrackingMixin:
    async def completion_(self: Provider, ctx: 'Context', **kwargs: Unpack[ChatCompletionCreate]):
        try:
            response = await super().completion(ctx, **kwargs)
        except Exception as e:
            await ctx.create_usage(request_body=kwargs).set_error(e).insert()
            raise

        if isinstance(response, ModelResponse):
            usage = ctx.create_usage()
            usage.set_model_usage(response.usage, ctx.modelinfo)
            await usage.insert()

            if env.bool('RESPONSE_WITH_SPEND', True):
                set_cost_details(response.usage, usage)

            return response

        elif isinstance(response, litellm.CustomStreamWrapper):
            return LiteLlmTrackingCompletionStream(ctx, response, kwargs['messages'])

        return response


@dataclass
class TrackingStream[T](ABC):
    ctx: 'Context'
    wrapped: AsyncIterable[T]

    @abstractmethod
    async def stream(self) -> AsyncIterator[T]: ...

    async def on_built_response(self, response: ModelResponse) -> None: ...


@dataclass
class LiteLlmTrackingCompletionStream(TrackingStream[ModelResponse]):
    messages: list

    async def stream(self):
        response: ModelResponse
        chunks: list[ModelResponse] = []

        async for i in self.wrapped:
            yield i
            chunks.append(i)

        if not chunks:
            return

        response = litellm.stream_chunk_builder(chunks, self.messages)
        await self.on_built_response(response)

        usagerecord = self.ctx.create_usage(is_stream=1)
        usagerecord.set_model_usage(response.usage, self.ctx.modelinfo)
        await usagerecord.insert()


TrackingCompletionStream = LiteLlmTrackingCompletionStream


class Misc(TypedDict, total=False):
    raw_openai: ChatCompletionCreate
    raw_amlchatscore: ScoreChatPayload
    raw_amlpromptscore: ScorePromptPayload
    raw_amlembeddingscore: ScoreEmbeddingPayload


@dataclass(slots=True, repr=False, init=False)
class Context:
    class ModelPoolDict(ModelPoolDict[Provider]):
        Provider = Provider

    apikey: Apikey
    models: ModelPoolDict
    response_time: CumulativeTimeIt
    hooks: Hooks | None
    modelinfo: ModelInfo | None
    provider: Provider | None
    request_id: str | None = None
    misc: Misc
    policy_responses: list[dict]
    usage_policy_digest: blake2s
    usage_policy_events: list[PolicyEvent]
    usage_kwargs: dict

    def __init__(self, apikey: Apikey, models: ModelPoolDict, request_id: str | None = None):
        self.apikey = apikey
        self.models = models
        self.response_time = CumulativeTimeIt()
        self.hooks = None
        self.modelinfo = None
        self.provider = None
        self.policy_responses = []
        self.usage_policy_digest = blake2s(digest_size=12)
        self.usage_policy_events = []
        self.usage_kwargs = {}
        self.misc = {}

        if request_id is not None:
            self.request_id = request_id
        else:
            if (vars := reqvars.get()) is not None:
                self.request_id = vars.get('request_id')

    @classmethod
    async def from_apikey(cls, key: Apikey) -> Self:
        models = await cls.ModelPoolDict.from_apikey_id_cached(key.id, key.updated_at)
        return cls(key, models)

    def select(self, model: str):
        if (modelinfo := self.models.get(model)) is not None:
            return model, modelinfo

        # Select a provider by type
        if '/' in model:
            provider, model = model.split('/', 1)
            providers = self.models.lookup(model, provider)

            if not providers:
                raise UnknownProviderError(provider=provider)

            return model, providers

        return model, self.models[model]

    async def invoke(self, callname: CallName, **kwargs):
        exception: Exception | None = None
        response: Any = None
        model, providers = self.select(kwargs['model'])
        hooks: tuple[GenericHook, ...] = getattr(self.hooks, callname, ())

        try:
            return_hooks = [await hook(self, kwargs) for hook in hooks]

            for self.modelinfo, self.provider in providers:
                try:
                    kwargs['model'] = self.modelinfo.name
                    response = await self.provider.invoke(self, callname, **kwargs)
                except Exception as e:
                    log.error('Failover: %r', e)
                    await self.create_usage(request_body=kwargs).set_error(e).insert()
                    exception = e
                else:
                    break

            if response is not None:
                if isinstance(response, litellm.CustomStreamWrapper):
                    response =  TrackingCompletionStream(self, response, kwargs['messages'])

                for hook in return_hooks:
                    if hook is not None:
                        response = await hook(response)

                if isinstance(response, (ModelResponse, EmbeddingResponse)):
                    response.trussed_controller_policy = self.policy_responses
                    usage = self.create_usage().set_model_usage(response.usage, self.modelinfo)

                    if env.bool('RESPONSE_WITH_SPEND', True):
                        set_cost_details(response.usage, usage)

                    await usage.insert()

                return response

        except BaseApiException as e:
            e.response_body['trussed_controller_policy'] = self.policy_responses
            raise
        
        except InstantApiResponse as e:
            e.response_body['trussed_controller_policy'] = self.policy_responses
            await self.create_usage().insert()
            raise

        if exception is not None:
            raise exception from None

        raise UnlistedModelError(model=model)

    def create_usage(self, **kwargs) -> UsageRecord:
        tags = extract_tags(self.apikey)

        metadata = UsageMetadata(
            scopes = self.apikey.scopes,
            ownership_id=self.apikey.ownership_id,
            key_id=self.apikey.id,
            tags=tags,
        )

        if self.provider is not None:
            metadata['provider'] = self.provider.name
            metadata['llm_id'] = self.provider.llm.id
            tags.update(self.provider.tags)

        if self.modelinfo is not None:
            metadata['model'] = self.modelinfo.name
            metadata['alias'] = self.modelinfo.alias
            tags.update(self.modelinfo.tags)

            if pool_id := self.modelinfo.pool_id:
                metadata['pool_id'] = pool_id

        if (state := core.state.get()) is not None:
            if dev_id := state.logvars.get('dev_id'):
                metadata['dev_id'] = dev_id

        kwargs.setdefault('response_time', self.response_time.elapsed)

        usage = UsageRecord(metadata=metadata, **(self.usage_kwargs | kwargs))
        usage.request_id = self.request_id

        usage.policy_events = self.usage_policy_events
        usage.policy_digest = self.usage_policy_digest.hexdigest()
        usage.policy_count = len(self.usage_policy_events)
        usage.policy_triggered = 1 if self.usage_policy_events else 0
        
        return usage


"""
@attrs.define
class Completion:
    body: ChatCompletionCreate
    hooks: tuple[CompletionHook, ...]

    def __init__(self, body: ChatCompletionCreate, hooks: Hooks):
        self.body = body
        self.hooks = hooks.completion

    def invoke(self, ctx: Context):
        return ctx.provider.completion(ctx, **self.body)
"""
