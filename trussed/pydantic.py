import re

from operator import itemgetter
from functools import cache
from typing import Annotated, Any
from datetime import datetime, UTC
from pytz import common_timezones_set

from pydantic import BaseModel
from pydantic import ValidationError, AfterValidator, PlainSerializer, BeforeValidator
from pydantic_core import PydanticCustomError, ErrorDetails


float3 = Annotated[float, PlainSerializer(lambda x: round(x, 3) if x else x)]


def NullTo(default):
    if callable(default):
        return BeforeValidator(lambda x: x or default())
    else:
        return BeforeValidator(lambda x: x or default)


def FilterItem(*items):
    getter = itemgetter(*items)
    return AfterValidator(lambda x: type(x)(filter(getter, x) if x else x))


@cache
def UpperCaseSlug(sep='_', split_pattern=r'[^\w\d]'):
    split = re.compile(split_pattern).split
    return AfterValidator(lambda x: sep.join(split(x)).upper() if x else x)


def RequireUnique(message='Duplicate values are not allowed'):
    def validator(value):
        if len(value) != len(set(value)):
            raise ValueError(message)

        return value

    return AfterValidator(validator)


def mask(x: str | None):
    if x:
        if len(x) > 5:
            return f'***{x[-4:]}'
        else:
            return '***'
    else:
        return x


MaskedStr = Annotated[
    str,
    PlainSerializer(lambda x: mask(x) if x is not None else x),
]

NonMaskedStr = Annotated[
    str | None,
    BeforeValidator(lambda x: None if x and mask(x) == x else x),
]


def validate_regex(pattern: str | None):
    if pattern is not None:
        try:
            re.compile(pattern)
        except Exception as e:
            raise PydanticCustomError('pattern_error', str(e)) from None

    return pattern


RegexStr = Annotated[str, AfterValidator(validate_regex)]


def validate_timezone(tz: str):
    if tz and tz not in common_timezones_set:
        raise ValueError('Must be a valid name of time zone')

    return tz


Timezone = Annotated[str, AfterValidator(validate_timezone)]


def default_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=dt.tzinfo or UTC)


TzDatetime = Annotated[datetime, AfterValidator(default_utc)]


def custom_validation_errors(title: str, errors: list[ErrorDetails]):
    return ValidationError.from_exception_data(
        title,
        [
            {
                'type': PydanticCustomError(i['type'], i['msg'], i.get('ctx')),
                'input': i['input'],
                'loc': i['loc'],
            }
            for i in errors
        ],
    )


def custom_validation_error(
    title: str,
    type: str,
    msg: str,
    loc: tuple[str | int],
    ctx: dict | None = None,
    input: Any = None,
):
    return ValidationError.from_exception_data(
        title,
        [
            {
                'type': PydanticCustomError(type, msg, ctx),
                'input': input,
                'loc': loc,
            }
        ],
    )


def model_update_if_none[T: BaseModel](target: T, source: T):
    for f in target.model_fields:
        if getattr(target, f) is None:
            setattr(target, f, getattr(source, f))


def joint_validation_message(e: ValidationError):
    lines = []

    for i in e.errors():
        field = '.'.join(map(str, i['loc']))
        message = i.get('ctx', {}).get('reason') or i['msg'].capitalize()
        lines.append(f'{field}: {message}')

    return '\n'.join(lines)
