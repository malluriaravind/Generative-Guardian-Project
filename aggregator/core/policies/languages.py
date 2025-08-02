import attrs
import logging

from typing import *

from blingfire import text_to_sentences
from litellm.types.utils import EmbeddingResponse

from trussed.typedef.openai import EmbeddingCreate
from trussed.utils import extract_strings
from trussed.utils.cache import lru_cache
from trussed.models.policies import Policy, PolicyType, LanguageAction
from trussed.models.usage import PolicyEvent

from core import syscheck
from core.types import ChatCompletionCreate, ChatCompletionMessage
from core.errors import InstantApiResponse, UnallowedLanguageError
from core.providers import Context, ModelResponse, BaseHook
from core.langdetect import Lingua, Language, LanguageDetector


log = logging.getLogger(__name__)

@attrs.define(eq=False)
class OperatedText:
    text: str
    samples: list[str]
    languages: list[str]


@attrs.define(eq=False)
class LanguageFilter(BaseHook):
    policy_type: ClassVar[PolicyType] = 'Languages'

    action: LanguageAction
    detector: LanguageDetector
    languages: set[Language]
    custom_message: str

    @classmethod
    async def from_policy(cls, policy: Policy) -> Self:
        match action := policy.languages.action:
            case 'Disabled':
                cls = cls
            case 'Sanitization':
                cls = LanguageFilterWithSanitization
            case 'CustomResponse':
                cls = LanguageFilterWithCustomResponse
            case 'Ban':
                cls = LanguageFilterWithBan
            case _:
                raise ValueError(f'Unknown language filter action: {action}')

        langset = {*policy.languages.allowed_languages, *Lingua.suggested_working_set}
        syscheck.ram(log, 100000000 ** (1 + len(langset) / 220)) # Base 100 Mb + some exponent

        lingua = Lingua(
            codes=policy.languages.allowed_languages,
            working_set=Lingua.suggested_working_set,
        )

        return cls(
            name=f'{policy.name} | {cls.policy_type} ({action})',
            action=action,
            detector=lingua.detector,
            languages={*lingua.codes.values()},
            custom_message=policy.languages.custom_message or '',
        )

    def handle(self, operated: OperatedText, text: str) -> str:
        return text

    def set_usage(self, ctx: Context, text: str, operated: OperatedText):
        ctx.usage_policy_events.append(
            PolicyEvent(
                policy=self.policy_type,
                action=self.action,
                priority=2,
                samples=[operated.samples[0][:50]]
            )
        )
        ctx.usage_policy_digest.update(f'{text}{id(self)}'.encode())

    @lru_cache(maxsize=512)
    def operate(self, text: str):
        sentences: list[str]
        sentences = (text_to_sentences(text) or text).split('\n')
        languages = self.detector.detect_languages_in_parallel_of(sentences)
        samples: list[str] = []

        for sentence, language in zip(sentences, languages):
            # Prevent some false positive
            if len(sentence) > 6:
                if language not in self.languages:
                    samples.append(sentence)
                    text = text.replace(sentence, '')

        return OperatedText(
            text,
            samples=samples,
            languages=[(i.iso_code_639_1.name if i else None) for i in languages],
        )

    def process(self, ctx: Context, text: str):
        operated = self.operate(text)

        ctx.policy_responses.append(
            {
                'policy_type': self.policy_type,
                'result': operated.languages,
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
                    raise UnallowedLanguageError from None

            body['input'] = processed

        async def on_return(response: EmbeddingResponse | Any):
            return response

        return on_return


@attrs.define(eq=False)
class LanguageFilterWithSanitization(LanguageFilter):
    @override
    def handle(self, operated: OperatedText, text: str):
        return operated.text


@attrs.define(eq=False)
class LanguageFilterWithCustomResponse(LanguageFilter):
    @override
    def handle(self, operated: OperatedText, text: str):
        response = ModelResponse()
        response.choices[0].message.content = self.custom_message
        response.usage.prompt_tokens = 0
        response.usage.completion_tokens = 0
        response.usage.total_tokens = 0
        raise InstantApiResponse(body=response.model_dump())


@attrs.define(eq=False)
class LanguageFilterWithBan(LanguageFilter):
    @override
    def handle(self, operated: OperatedText, text: str):
        raise UnallowedLanguageError()
