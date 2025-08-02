import re
import logging
import attrs

from typing import *
from dataclasses import dataclass
from trussed.models.policies import Policy
from trussed.utils.cache import lru_cache
from trussed.utils.tokengenerator import tokengetter

from litellm.utils import ModelResponse, StreamingChoices, Delta

from core.types import ChatCompletionCreate
from core.providers import Context, TrackingStream
from . import PiiFilter, OperatedText

log = logging.getLogger(__name__)


@attrs.define
class TokenOperatedText(OperatedText):
    tokenized: dict[str, str] | None = None


@attrs.define(init=False)
class ChunkedUntokenizer:
    chunk: str
    tag: str
    length: int
    tokenized: dict[str, str]
    send: Callable[[str], list[str]]

    def __init__(self, tag: str, length: int, tokenized: dict[str, str]):
        self.chunk = ''
        self.tag = tag
        self.length = length
        self.tokenized = tokenized
        self.send = (generator := self.untokenizer()).send
        next(generator)

    def untokenizer(self) -> Generator[list[str], str, None]:
        output = []

        while True:
            if not self.chunk:
                self.chunk = yield output
                output = []

            if (index := self.chunk.find(self.tag)) == -1:
                output.append(self.chunk)
                self.chunk = ''
                continue

            if self.chunk[:index]:
                output.append(self.chunk[:index])

            self.chunk = self.chunk[index:]

            while len(self.chunk) < self.length:
                self.chunk += yield []

            token = self.chunk[: self.length]

            if (index := token.find(self.tag, 1)) == -1:
                output.append(self.tokenized.get(token, token))
                self.chunk = self.chunk[self.length :]
            else:
                output.append(self.chunk[:index])
                self.chunk = self.chunk[index:]


class StreamingModelResponse(ModelResponse):
    def __init__(self, source: ModelResponse, index: int, content: str, **kwargs):
        super().__init__(
            id=source.id,
            created=source.created,
            object=source.object,
            choices=[
                StreamingChoices(
                    index=index,
                    delta=Delta(content=content, role='assistant'),
                )
            ],
            **kwargs,
        )


@dataclass
class StreamUntokenizer(TrackingStream[ModelResponse]):
    tag: str
    length: int
    tokenized: dict[str, str]

    async def stream(self):
        untokenizers: dict[int, ChunkedUntokenizer] = {}

        async for i in self.wrapped:
            choice_index = i.choices[0].index
            choice_content = i.choices[0].delta.content

            # The end of the stream; yield already buferized data
            if choice_content is None:
                if untoken := untokenizers.get(choice_index):
                    if untoken.chunk:
                        yield StreamingModelResponse(i, choice_index, untoken.chunk)

                yield i
                continue

            if (untoken := untokenizers.get(choice_index)) is None:
                untoken = ChunkedUntokenizer(self.tag, self.length, self.tokenized)
                untokenizers[choice_index] = untoken

            if data := untoken.send(choice_content):
                if len(data) == 1 and data[0] == choice_content:
                    yield i
                    continue

                for content in data:
                    yield StreamingModelResponse(i, choice_index, content)


def tokenfinder(tag: str, length: int):
    return re.compile(re.escape(tag) + rf'\S{{{length}}}').findall


@attrs.define(kw_only=True, eq=False)
class TokenizationPiiFilter(PiiFilter):
    action: ClassVar[str] = 'Tokenization'
    tokentag: ClassVar[str] = 'Δ'
    tokenlen: ClassVar[int] = 12

    tokengetter: Callable[[], str]
    tokenfinder: Callable[[str], list[str]]
    tokenized: dict[str, str]

    @classmethod
    async def from_policy(cls, policy: Policy):
        return await super().from_policy(
            policy,
            tokengetter = tokengetter(length=cls.tokenlen),
            tokenfinder = tokenfinder(cls.tokentag, cls.tokenlen),
            tokenized = {}
        )

    def redact(self, text: str, entity: str):
        token = self.tokentag + self.tokengetter()
        self.tokenized[token] = text
        return token

    @lru_cache(maxsize=512)
    def operate(self, text: str):
        self.tokenized = {}
        operated = super().operate(text, TokenOperatedText)
        operated.tokenized = self.tokenized
        return operated

    async def on_completion(self, ctx: Context, body: ChatCompletionCreate):
        # An invisible trailing character to mark response messages with restored PII.
        # Such messages must be anonymized again before sending.
        TAG = '\u200e'
        tokenized: dict[str, str] = {}

        for message in body['messages']:
            if message['role'] == 'user' or message['content'].endswith(TAG):
                operated = self.operate(message['content'])

                if operated.anonymized.items:
                    self.set_usage(ctx, message['content'], operated)

                tokenized.update(operated.tokenized)
                message['content'] = operated.anonymized.text

        async def on_return(response: ModelResponse | Any):
            # Untokenize PII
            if isinstance(response, ModelResponse):
                for choice in response.choices:
                    if not choice.message.content:
                        continue

                    for token in self.tokenfinder(choice.message.content):
                        choice.message.content = choice.message.content.replace(
                            token,
                            tokenized[token],
                        )
                        choice.message.content += TAG

            elif isinstance(response, TrackingStream):
                return StreamUntokenizer(
                    ctx,
                    response.stream(),
                    self.tokentag,
                    self.tokenlen + 1,  # with tag
                    tokenized,
                )

            return response

        return on_return
