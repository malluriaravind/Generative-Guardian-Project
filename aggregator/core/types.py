from typing import *


class ChatCompletionMessage(TypedDict, total=False):
    content: Required[str]
    role: Required[Literal['system', 'assistant', 'user', 'function']]
    name: str


class ResponseFormat(TypedDict, total=False):
    type: Literal['text', 'json_object']


class Function(TypedDict, total=False):
    name: Required[str]


class ChatCompletionNamedToolChoice(TypedDict, total=False):
    function: Required[Function]
    type: Required[Literal['function']]


class FunctionDefinition(TypedDict, total=False):
    name: Required[str]
    description: str
    parameters: dict[str, object]


class ChatCompletionTool(TypedDict, total=False):
    function: Required[FunctionDefinition]
    type: Required[Literal['function']]


class ChatCompletionCreate(TypedDict, total=False):
    messages: Required[List[ChatCompletionMessage]]
    model: Required[str]
    frequency_penalty: Optional[float]
    logit_bias: Optional[Dict[str, int]]
    logprobs: Optional[bool]
    max_tokens: Optional[int]
    n: Optional[int]
    presence_penalty: Optional[float]
    response_format: ResponseFormat
    seed: Optional[int]
    stop: Union[Optional[str], List[str]]
    stream: Optional[bool]
    temperature: Optional[float]
    tool_choice: Union[Literal['none', 'auto'], ChatCompletionNamedToolChoice]
    tools: Optional[List[ChatCompletionTool]]
    top_logprobs: Optional[int]
    top_p: Optional[float]
    timeout: Optional[float]
    user: str
