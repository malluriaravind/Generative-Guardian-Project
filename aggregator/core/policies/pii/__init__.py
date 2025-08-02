import sys
import logging
import asyncio
import attrs
import fcntl
import spacy

from typing import *
from pathlib import Path

from spacy.cli.download import get_model_filename
from spacy.about import __download_url__

from presidio_analyzer import AnalyzerEngine, EntityRecognizer, PatternRecognizer
from presidio_analyzer.pattern import Pattern
from presidio_analyzer.nlp_engine import SpacyNlpEngine, NerModelConfiguration
from presidio_analyzer.context_aware_enhancers import LemmaContextAwareEnhancer

from presidio_anonymizer import AnonymizerEngine, EngineResult, OperatorConfig
from presidio_anonymizer.operators import Operator, OperatorType

from trussed.models.policies import Policy, PolicyType
from trussed.models.policies import PiiEntity, PiiModel, PiiAction
from trussed.models.pii import CustomPii
from trussed.models.usage import PolicyEvent
from trussed.utils import extract_strings
from trussed.utils.cache import cache, lru_cache
from trussed.typedef.openai import ChatCompletionCreate, EmbeddingCreate


from core.errors import PolicyIsNotReadyError
from core.langdetect import Lingua
from core.providers import Context, ModelResponse, EmbeddingResponse, BaseHook
from core.policies.pii.recognizers.nerpattern import NerPatternRecognizer


log = logging.getLogger(__name__)

ner_model_configuration = NerModelConfiguration(
    labels_to_ignore={
        # "O",
        # "ORG",
        # "ORGANIZATION",
        'CARDINAL',
        'EVENT',
        'LANGUAGE',
        'LAW',
        'MONEY',
        'ORDINAL',
        'PERCENT',
        # "PRODUCT",
        'QUANTITY',
        'WORK_OF_ART',
    },
)

context_aware_enhancer = LemmaContextAwareEnhancer(
    context_similarity_factor=ner_model_configuration.default_score,
    min_score_with_context_similarity=ner_model_configuration.default_score,
    context_prefix_count=5,
    context_suffix_count=3,
)


class CustomAnonymizer(Operator):
    class Params(TypedDict):
        call: Callable[[str, str], str]
        entity_type: str

    def operate(self, text: str, params: Params) -> str:
        return params['call'](text, params['entity_type'])

    def validate(self, params: Params):
        pass

    def operator_name(self) -> str:
        return 'custom'

    def operator_type(self) -> OperatorType:
        return OperatorType.Anonymize

    @classmethod
    def config(cls, call: Callable[[str], str]):
        return OperatorConfig('custom', {'call': call})


anonymizer = AnonymizerEngine()
anonymizer.add_anonymizer(CustomAnonymizer)


class ModelIsNotReadyError(Exception):
    pass


class LoadedSpacyNlpEngine(SpacyNlpEngine):
    nlp: dict[str, spacy.Language]

    def __init__(self, languages: list[spacy.Language], **kwargs):
        models = [
            {
                'lang_code': nlp.meta['lang'],
                'model_name': nlp.meta['name'],
            }
            for nlp in languages
        ]

        super().__init__(
            models=models,
            ner_model_configuration=ner_model_configuration,
            **kwargs,
        )
        self.nlp = {nlp.meta['lang']: nlp for nlp in languages}


class PiiAnalyzerEngine(AnalyzerEngine):
    nlp_engine: LoadedSpacyNlpEngine

    @classmethod
    async def from_policy(cls, policy: Policy) -> Self:
        engine = LoadedSpacyNlpEngine(get_models_auto(policy.pii.models))
        self = cls(
            nlp_engine=engine,
            context_aware_enhancer=context_aware_enhancer,
            supported_languages=[*engine.nlp],
            default_score_threshold=0.1,
            log_decision_process=False,
        )
        return await self.load_custom_recognizers(policy.pii.entities)

    async def load_custom_recognizers(self, entities: list[PiiEntity]):
        ids = [i['entity_id'] for i in entities if i.get('entity_id')]

        async for pii in CustomPii.find({'_id': {'$in': ids}}):
            if pii.context_words:
                # Let the context enhancer boost scores
                score = 0.01
            else:
                score = EntityRecognizer.MAX_SCORE

            for language in self.supported_languages:
                if pii.prerecognition_entity:
                    self.registry.add_recognizer(
                        NerPatternRecognizer(
                            base_entity=pii.prerecognition_entity,
                            supported_entity=pii.entity,
                            pattern=pii.pattern,
                            score=score,
                            supported_language=language,
                            context=pii.context_words,
                        )
                    )
                else:
                    self.registry.add_recognizer(
                        PatternRecognizer(
                            supported_entity=pii.entity,
                            patterns=[Pattern('custom', pii.pattern, score)],
                            supported_language=language,
                            context=pii.context_words,
                        )
                    )

        return self


@attrs.define
class OperatedText:
    language: str | None
    anonymized: EngineResult


OT = TypeVar('OT', bound=OperatedText)


@attrs.define(kw_only=True, eq=False)
class PiiFilter(BaseHook):
    policy_type: ClassVar[PolicyType] = 'PII'
    classes: ClassVar[dict[PiiAction, type[Self]]] = {}
    action: ClassVar[PiiAction]

    analyzer: AnalyzerEngine
    entities: list[str]
    langdetector: Lingua
    supported_languages: KeysView[str]
    fallback_language: str

    @classmethod
    def register(cls):
        cls.classes[cls.action] = cls

    @classmethod
    async def from_policy(cls, policy: Policy, **kwargs):
        try:
            analyzer = await PiiAnalyzerEngine.from_policy(policy)
            supported_languages = analyzer.nlp_engine.nlp.keys()
        except ModelIsNotReadyError:
            raise PolicyIsNotReadyError from None

        # Use SpaCy multi-language model as default, if present
        if 'xx' in supported_languages:
            fallback_language = 'xx'
        else:
            fallback_language = next(iter(supported_languages))

        return cls(
            name=f'{policy.name} | {cls.policy_type} ({cls.action})',
            analyzer=analyzer,
            entities=[i['entity'] for i in policy.pii.entities],
            supported_languages=supported_languages,
            fallback_language=fallback_language,
            langdetector=Lingua(
                codes=supported_languages - {'xx'},
                working_set=Lingua.suggested_working_set,
            ),
            **kwargs,
        )

    @property
    @lru_cache
    def operators(self) -> dict[str, OperatorConfig]:
        return {'DEFAULT': CustomAnonymizer.config(self.redact)}

    def redact(self, text: str, entity: str):
        return f'<{entity}>'

    @lru_cache(maxsize=512)
    def operate(self, text: str, cls: type[OT] = OperatedText) -> OT:
        language = analyze_language = self.langdetector.detect(text)

        if analyze_language not in self.supported_languages:
            analyze_language = self.fallback_language

        analyzed = self.analyzer.analyze(text, analyze_language, self.entities)
        anonymized = anonymizer.anonymize(text, analyzed, self.operators)
        return cls(language=language, anonymized=anonymized)

    def set_usage(self, ctx: Context, text: str, operated: OperatedText):
        ctx.usage_policy_events.append(
            PolicyEvent(
                policy=self.policy_type,
                action=self.action,
                priority=2,
                samples=[i.entity_type for i in operated.anonymized.items]
            )
        )
        ctx.usage_policy_digest.update(f'{text}{id(self)}'.encode())

    async def on_completion(self, ctx: Context, body: ChatCompletionCreate):
        for message in body['messages']:
            if message['role'] == 'user':
                operated = self.operate(message['content'])

                if operated.anonymized.items:
                    self.set_usage(ctx, message['content'], operated)

                message['content'] = operated.anonymized.text

        async def on_return(response: ModelResponse | Any):
            return response

        return on_return

    async def on_embedding(self, ctx: Context, body: EmbeddingCreate):
        processed: list[str] = []

        if strings := extract_strings(body['input']):
            for content in strings:
                operated = self.operate(content)

                if operated.anonymized.items:
                    self.set_usage(ctx, content, operated)

                processed.append(operated.anonymized.text)

            body['input'] = processed

        async def on_return(response: EmbeddingResponse | Any):
            return response

        return on_return


@cache
def get_model(model: str):
    if spacy.util.is_package(model):
        return spacy.load(model)

    raise ModelIsNotReadyError(f'NLP model {model} is not installed')


def get_models_auto(models: list[PiiModel]):
    try:
        return [get_model(i['model']) for i in models]
    except ModelIsNotReadyError:
        try:
            lockfile = open('.trussed-pip-lockfile', 'w')
            fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ModelIsNotReadyError('NLP model is being installed') from None

        asyncio.create_task(install_models(models, lockfile))
        raise ModelIsNotReadyError('NLP model is awaiting installation') from None


def pip_install(*args: str):
    pip = Path(sys.executable).parent.joinpath('pip')

    if not pip.exists():
        raise IOError('PIP not found')

    return [pip, 'install', *args]


async def install_models(models: list[PiiModel], lockfile: IO):
    with lockfile:
        for i in models:
            if not spacy.util.is_package(i['model']):
                filename = get_model_filename(i['model'], i['version'])
                url = f'{__download_url__}/{filename}'
                cmd = pip_install(url)
                log.info('NLP %s: %s', i['model'], cmd)

                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                )

                while line := await process.stdout.readline():
                    log.info('NLP %s: %s', i['model'], line.decode().strip())

                code = await process.wait()
                log.info('NLP %s: installation finished (%i)', i['model'], code)
