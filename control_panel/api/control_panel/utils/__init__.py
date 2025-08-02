from typing import *
from itertools import chain


DictT = TypeVar('DictT', bound=dict)
T = TypeVar('T')
F = TypeVar('F', bound=Callable[[Any], Hashable])


def deduplicate_dicts(a: list[DictT], b: list[DictT], key: Hashable) -> list[DictT]:
    values = {i.get(key) for i in a}
    return a + [i for i in b if i.get(key, ...) not in values]


def deduplicate(a: Iterable[T], b: Iterable[T], key: F) -> Iterator[T]:
    values = {*map(key, a)}
    return chain(a, (i for i in b if key(i) not in values))
