from pydantic import BaseModel, Field, EmailStr
from control_panel.enums import Role


class CurrentUserDto(BaseModel):
    first_name: str = Field(min_length=3)
    last_name: str = Field(min_length=3)
    email: str
    role: Role = Field(default=Role.User)


class UserCreationDto(CurrentUserDto):
    password: str = Field(min_length=8)
    password2: str = Field(min_length=8)


class UserLoginDto(BaseModel):
    email: str
    password: str = Field(min_length=8)
