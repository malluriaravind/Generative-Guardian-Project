import logging
import dataclasses

from typing import ClassVar
from contextvars import ContextVar

from ..cache import cache


class LogLevelDict(dict[str, int]):
    def __missing__(self, key):
        return logging.NOTSET


class LogCacheDict(dict[str, dict]):
    def __missing__(self, key):
        return self.setdefault(key, {})


@dataclasses.dataclass(slots=True)
class ContextLoggerState:
    levels: LogLevelDict
    caches: LogCacheDict


class ContextualLogger(logging.Logger):
    default_levels = LogLevelDict()
    default_caches = LogCacheDict()

    ctx_levels: ClassVar[ContextVar[LogLevelDict]] = ContextVar(
        'ctx_levels', default=default_levels
    )
    ctx_caches: ClassVar[ContextVar[LogCacheDict]] = ContextVar(
        'ctx_caches', default=default_caches
    )

    @classmethod
    def newState(cls):
        return ContextLoggerState(
            levels=LogLevelDict(cls.ctx_levels.get()),
            caches=LogCacheDict(),
        )

    @classmethod
    def setState(cls, state: ContextLoggerState):
        cls.ctx_levels.set(state.levels)
        cls.ctx_caches.set(state.caches)

    @property
    def level(self) -> int:
        return self.ctx_levels.get()[self.name]

    @level.setter
    def level(self, level: int):
        if level:
            self.ctx_levels.get()[self.name] = level

    @property
    def _cache(self) -> dict:
        return self.ctx_caches.get()[self.name]

    @_cache.setter
    def _cache(self, cache: dict):
        self.ctx_caches.get()[self.name] = cache


class RootLogger(logging.RootLogger, ContextualLogger):
    def __init__(self, level):
        """
        Initialize the logger with the name "root".
        """
        ContextualLogger.__init__(self, "root", level)


root = RootLogger(logging.WARNING)


def patch_ctx_logging():
    logging.setLoggerClass(ContextualLogger)

    logging.root = root
    logging.Logger.root = root
    logging.Logger.manager = logging.Manager(root)


@cache
def patch_ctx_logging_once():
    patch_ctx_logging()

