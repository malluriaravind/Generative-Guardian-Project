import attrs
import logging

from typing import *

from litellm.types.utils import EmbeddingResponse

from trussed.typedef.openai import EmbeddingCreate
from trussed.utils import extract_strings
from trussed.utils.cache import lru_cache
from trussed.models.policies import Policy, PolicyType, TopicsAction, TopicSpec
from trussed.models.usage import PolicyEvent

from core import env
from core.types import ChatCompletionCreate, ChatCompletionMessage
from core.errors import InstantApiResponse, ForbiddenTopicError
from core.providers import Context, ModelResponse, BaseHook
from core.trf import get_trf_pipeline, ZeroShotClassificationPipeline


# English only, 0.35 B parameters
# model_id = 'MoritzLaurer/roberta-large-zeroshot-v2.0-c'
# revision = '4c24ed4bba5af8d3162604abc2a141b9d2183ecc'
# cpu_require_ram = 1024 * 1024 * 1450 # 1.4 Gb

model_id = 'MoritzLaurer/deberta-v3-large-zeroshot-v2.0'
revision ='cf44676c28ba7312e5c5f8f8d2c22b3e0c9cdae2'
cpu_require_ram = 1024 * 1024 * 1700 # 1.7 Gb

log = logging.getLogger(__name__)


@attrs.define(eq=False)
class OperatedText:
    text: str
    samples: list[str]
    scores: list[dict]


@attrs.define(eq=False)
class TopicsFilter(BaseHook):
    policy_type: ClassVar[PolicyType] = 'Topics'

    action: TopicsAction
    topics: list[str]
    topics_map: dict[str, TopicSpec]
    pipeline: ZeroShotClassificationPipeline
    custom_message: str

    @classmethod
    async def from_policy(cls, policy: Policy) -> Self:
        match action := policy.topics.action:
            case 'Disabled':
                cls = cls
            case 'CustomResponse':
                cls = TopicsFilterWithCustomResponse
            case 'Ban':
                cls = TopicsFilterWithBan
            case _:
                raise ValueError(f'Unknown topics detector action: {action}')

        topics_map = {i.topic: i for i in policy.topics.ban_topics or ()}

        pipeline = get_trf_pipeline(
            'zero-shot-classification',
            env.str('TRF_TOPICS_MODEL_ID', model_id),
            env.str('TRF_TOPICS_MODEL_REV', revision),
            cpu_require_ram=env.int('TRF_TOPICS_REQUIRE_RAM', cpu_require_ram),
        )

        return cls(
            name=f'{policy.name} | {cls.policy_type} ({action})',
            action=action,
            topics=[*topics_map],
            topics_map=topics_map,
            pipeline=pipeline,
            custom_message=policy.topics.custom_message or '',
        )

    def handle(self, operated: OperatedText, message: ChatCompletionMessage):
        pass

    def set_usage(self, ctx: Context, text: str, operated: OperatedText):
        ctx.usage_policy_events.append(
            PolicyEvent(
                policy=self.policy_type,
                action=self.action,
                priority=3,
                samples=operated.samples
            )
        )
        ctx.usage_policy_digest.update(f'{text}{id(self)}'.encode())

    @lru_cache(maxsize=1024)
    def operate(self, text: str):
        result = self.pipeline(text, self.topics, multi_label=True)
        samples: list[str] = []
        allscores = []

        for topic, score in zip(result['labels'], result['scores']):
            allscores.append({'topic': topic, 'score': score})

            if score > self.topics_map[topic].threshold:
                samples.append(topic)

        return OperatedText(text, samples=samples, scores=allscores)
    
    def process(self, ctx: Context, text: str):
        operated = self.operate(text)

        ctx.policy_responses.append(
            {
                'policy_type': self.policy_type,
                'result': operated.scores,
            }
        )

        if operated.samples:
            self.set_usage(ctx, text, operated)
            self.handle(operated, text)

    async def on_completion(self, ctx: Context, body: ChatCompletionCreate):
        for message in body['messages']:
            if message['role'] == 'user':
                self.process(ctx, message['content'])

        async def on_return(response: ModelResponse | Any):
            return response

        return on_return

    async def on_embedding(self, ctx: Context, body: EmbeddingCreate):
        if strings := extract_strings(body['input']):
            for content in strings:
                try:
                    self.process(ctx, content)
                except InstantApiResponse as e:
                    raise ForbiddenTopicError from None

        async def on_return(response: EmbeddingResponse | Any):
            return response

        return on_return

@attrs.define(eq=False)
class TopicsFilterWithCustomResponse(TopicsFilter):
    def handle(self, operated: OperatedText, message: ChatCompletionMessage):
        response = ModelResponse()
        response.choices[0].message.content = self.custom_message
        response.usage.prompt_tokens = 0
        response.usage.completion_tokens = 0
        response.usage.total_tokens = 0
        raise InstantApiResponse(body=response.model_dump())


@attrs.define(eq=False)
class TopicsFilterWithBan(TopicsFilter):
    def handle(self, operated: OperatedText, message: ChatCompletionMessage):
        raise ForbiddenTopicError()
