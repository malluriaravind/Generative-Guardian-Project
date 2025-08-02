from typing import TypedDict, Protocol
from beanie import PydanticObjectId


class SysTag(TypedDict):
    tag: str
    ref: PydanticObjectId | None


class WithTags(Protocol):
    tags: list[str] | None = None
    system_tags: list[SysTag] | None = None


def extract_tags(source: WithTags) -> set[str]:
    tags = set()

    if source.tags is not None:
        tags.update(source.tags)

    if source.system_tags is not None:
        tags.update(i['tag'] for i in source.system_tags)

    return tags
