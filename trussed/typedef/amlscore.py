from typing import *
from pydantic import ConfigDict


class ScoreChatMessage(TypedDict, total=False):
    content: Required[str]
    role: Required[Literal['system', 'assistant', 'user']]
    name: str


class ScoreParameters(TypedDict, total=False):
    __pydantic_config__ = ConfigDict(extra='allow') # type: ignore
    temperature: float
    max_new_tokens: int
    top_k: float
    top_p: float
    do_sample: bool
    return_full_text: bool
    ignore_eos: bool


class ScoreChatInputData(TypedDict, total=False):
    input_string: Required[list[ScoreChatMessage]]
    parameters: ScoreParameters


class ScoreChatPayload(TypedDict, total=False):
    input_data: Required[ScoreChatInputData]


class ScorePromptPayload(TypedDict, total=False):
    __pydantic_config__ = ConfigDict(extra='allow') # type: ignore
    prompt: Required[str]


class ScoreEmbeddingPayload(TypedDict, total=False):
    __pydantic_config__ = ConfigDict(extra='allow') # type: ignore
    documents: Required[list | str]
    dimensions: int

