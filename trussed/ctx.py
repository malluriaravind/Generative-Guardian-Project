from dataclasses import dataclass
from contextvars import ContextVar
from bson import ObjectId


@dataclass(slots=True)
class Ctx:
    tz = ContextVar[str]('tz', default='UTC')
    ownership_id = ContextVar[ObjectId]('ownership_id', default=None) # Deprecated


ctx = Ctx()

