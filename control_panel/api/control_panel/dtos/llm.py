from pydantic import BaseModel
from control_panel.models.llm import *


class LlmInDto(BaseModel):
    name: str = None
    provider: LlmProvider
    api_key: str


class LlmUpdateDto(BaseModel):
    name: str = None
    provider: LlmProvider = None
    api_key: str = None


class LlmOutDto(Llm):
    api_key: str = Field(exclude=True)
