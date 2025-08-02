from pydantic import BaseModel, Field


class ChangePasswordDto(BaseModel):
    password: str = Field(min_length=8)
    password2: str = Field(min_length=8)
