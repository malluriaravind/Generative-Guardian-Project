import attrs

from itertools import pairwise
from typing import *

from blingfire import text_to_sentences

from trussed.utils import extract_strings
from trussed.utils.cache import lru_cache
from trussed.typedef.openai import ChatCompletionCreate, ChatCompletionMessage, EmbeddingCreate
from trussed.models.policies import Policy, InjectionAction, PolicyType
from trussed.models.usage import PolicyEvent

from core import env
from core.errors import InstantApiResponse, PromptInjectionError
from core.providers import Context, ModelResponse, EmbeddingResponse, BaseHook
from core.trf import get_trf_pipeline, TextClassificationPipeline, ClassificationResult


model_id = 'protectai/deberta-v3-base-prompt-injection-v2'
revision = '89b085cd330414d3e7d9dd787870f315957e1e9f'
cpu_require_ram = 1024 * 1024 * 900 # 900 Mb


@attrs.define(eq=False)
class OperatedText:
    text: str
    score: float
    samples: list[str]


@attrs.define(eq=False)
class InjectionFilter(BaseHook):
    policy_type: ClassVar[PolicyType] = 'Injection'

    action: InjectionAction
    threshold: float
    pipeline: TextClassificationPipeline
    custom_message: str

    safe_label: str = 'SAFE'
    unsafe_label: str = 'INJECTION'

    def get_score(self, result: ClassificationResult):
        if result['label'] == self.safe_label:
            return 1 - result['score']

        if result['label'] == self.unsafe_label:
            return result['score']

        return 0

    @classmethod
    async def from_policy(cls, policy: Policy) -> Self:
        match action := policy.injection.action:
            case 'Disabled':
                cls = cls
            case 'Sanitization':
                cls = InjectionFilterWithSanitization
            case 'CustomResponse':
                cls = InjectionFilterWithCustomResponse
            case 'Ban':
                cls = InjectionFilterWithBan
            case _:
                raise ValueError(f'Unknown injection detector action: {action}')

        pipeline = get_trf_pipeline(
            'text-classification',
            env.str('TRF_INJECTIONS_MODEL_ID', model_id),
            env.str('TRF_INJECTIONS_MODEL_REV', revision),
            cpu_require_ram=env.int('TRF_INJECTIONS_REQUIRE_RAM', cpu_require_ram),
        )

        return cls(
            name=f'{policy.name} | Injections ({action})',
            action=action,
            threshold=policy.injection.threshold,
            pipeline=pipeline,
            custom_message=policy.injection.custom_message or '',
        )

    def handle(self, operated: OperatedText, text: str):
        return text

    def set_usage(self, ctx: Context, text: str, operated: OperatedText):
        ctx.usage_policy_events.append(
            PolicyEvent(
                policy=self.policy_type,
                action=self.action,
                priority=3,
                samples=[operated.samples[0][:50]]
            )
        )
        ctx.usage_policy_digest.update(f'{text}{id(self)}'.encode())

    @lru_cache(maxsize=1000)
    def operate(self, text: str):
        max_score = 0.0
        samples: list[str] = []

        for result in self.pipeline([text]):
            score = self.get_score(result)
            max_score = max(score, max_score)

        if max_score > self.threshold:
            samples = [text]

        return OperatedText(text, max_score, samples=samples)

    def process(self, ctx: Context, text: str):
        operated = self.operate(text)

        ctx.policy_responses.append(
            {
                'policy_type': self.policy_type,
                'result': [{'score': operated.score}],
            }
        )

        if operated.samples:
            self.set_usage(ctx, text, operated)
            return self.handle(operated, text)

        return text

    async def on_completion(self, ctx: Context, body: ChatCompletionCreate):
        for message in body['messages']:
            if message['role'] == 'user':
                message['content'] = self.process(ctx, message['content'])

        async def on_return(response: ModelResponse | Any):
            return response

        return on_return


    async def on_embedding(self, ctx: Context, body: EmbeddingCreate):
        processed: list[str] = []

        if strings := extract_strings(body['input']):
            for content in strings:
                try:
                    processed.append(self.process(ctx, content))
                except InstantApiResponse as e:
                    raise PromptInjectionError from None

            body['input'] = processed

        async def on_return(response: EmbeddingResponse | Any):
            return response

        return on_return

@attrs.define(eq=False)
class InjectionFilterWithSanitization(InjectionFilter):
    @lru_cache(maxsize=1000)
    def operate(self, text: str):
        sentences = cast(list[str], (text_to_sentences(text) or text).split('\n'))

        if len(sentences) < 2:
            sentences.append('')

        source_sentences = pairwise(sentences)
        joined_sentences = [*map(' '.join, pairwise(sentences))]
        samples: list[str] = []
        max_score = 0.0

        for source, result in zip(source_sentences, self.pipeline(joined_sentences)):
            if (score := self.get_score(result)) > self.threshold:
                samples.append(' '.join(source))
                text = text.replace(source[0], '').replace(source[1], '')

            max_score = max(score, max_score)

        return OperatedText(text, max_score, samples=samples)

    @override
    def handle(self, operated: OperatedText, text: str):
        return operated.text


@attrs.define(eq=False)
class InjectionFilterWithCustomResponse(InjectionFilter):
    @override
    def handle(self, operated: OperatedText, text: str):
        response = ModelResponse()
        response.choices[0].message.content = self.custom_message
        response.usage.prompt_tokens = 0
        response.usage.completion_tokens = 0
        response.usage.total_tokens = 0
        raise InstantApiResponse(body=response.model_dump())


@attrs.define(eq=False)
class InjectionFilterWithBan(InjectionFilter):
    @override
    def handle(self, operated: OperatedText, text: str):
        raise PromptInjectionError()
