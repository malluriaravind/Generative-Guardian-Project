from contextvars import ContextVar
from dataclasses import dataclass, field

from typing import Self
from core.providers import Context, Apikey


@dataclass(slots=True, repr=False)
class State:
    current = ContextVar[Self | None]('current', default=None)
    get = staticmethod(current.get)
    set = staticmethod(current.set)

    logvars: dict = field(init=True)
    apikey: Apikey | None = None
    context: Context | None = None


get = State.current.get
set = State.current.set

