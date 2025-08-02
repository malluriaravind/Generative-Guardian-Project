from typing import Annotated, Sequence
from fastapi import Query
from pydantic import BeforeValidator


def splitcsv(x: str | Sequence[str]):
    if isinstance(x, str):
        return x.split(',')
    else:
        return x


type Csv[T] = Annotated[T, BeforeValidator(splitcsv), Query()]
