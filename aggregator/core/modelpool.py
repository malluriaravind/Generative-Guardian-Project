import dataclasses

from typing import *

from bson import ObjectId
from trussed.utils.dict import MyDict
from trussed.utils.cache import lru_cache, alru_cache
from trussed.models.llm import LlmFeature
from trussed.models.systag import extract_tags
from trussed.models.pool import ModelPool
from trussed.models.apikey import Apikey

from .providers.base import ModelInfo, BaseProvider
from .errors import UnlistedModelError, InvalidApiKeyError, UnsupportedFeaturesError


class ModelPoolDict[T: BaseProvider](MyDict[str, list[tuple[ModelInfo, T]]]):
    """
    A mapping example:
    {
        'gpt-dev-1': [(ModelInfo, Provider1), (ModelInfo, Provider1)],
        'gpt-dev-2': [(ModelInfo, Provider2), (ModelInfo, Provider2)],
    }
    """

    Provider: ClassVar[type[T]] = BaseProvider
    tags: set[str]

    def __init__(self):
        self.tags = set()

    def __missing__(self, model):
        if self.keys():
            message = (  # fmt: off
                f"Model '{model}' is not listed in LLM access list nor model pool. "
                'Try ' + ', '.join(self.keys())
            )  # fmt: on
        else:
            message = f"Model '{model}' is not listed in LLM access list nor model pool"

        raise UnlistedModelError(message, model=model)

    @classmethod
    @alru_cache
    async def from_apikey_id_cached(cls, apikey_id: ObjectId, ts: Hashable):
        self = cls()
        apikey = await Apikey.find_one(Apikey.id == apikey_id)

        if not apikey:
            raise InvalidApiKeyError()

        self.merge(await self.from_llm_ids(apikey.llm_access))
        self.merge(await self.from_ids(apikey.pool_access))

        return self

    @classmethod
    async def from_ids(cls, pool_ids: tuple[ObjectId, ...]) -> Self:
        self = cls()

        for pool_id in pool_ids:
            self.merge(await cls.from_id(pool_id))

        return self

    @classmethod
    async def from_id(cls, pool_id: ObjectId) -> Self:
        pool = await ModelPool.find_one(ModelPool.id == pool_id)
        self = cls()

        if pool is None:
            return self

        self.tags = extract_tags(pool)

        for modelref in pool.models:
            provider = await cls.Provider.from_id(modelref['llm_id'])

            if provider is None:
                continue

            if modelref['alias'] not in provider:
                continue

            modelinfo = provider[modelref['alias']]
            modelinfo = dataclasses.replace(
                modelinfo,
                pool_id=pool_id,
                tags=modelinfo.tags | self.tags,
            )
            self.setdefault(pool.virtual_model_name, []).append((modelinfo, provider))

        return self

    @classmethod
    async def from_llm_ids(cls, llm_ids: tuple[ObjectId, ...]) -> Self:
        self = cls()

        for llm_id in llm_ids:
            self.merge(await cls.from_llm_id(llm_id))

        return self

    @classmethod
    async def from_llm_id(cls, llm_id: ObjectId) -> Self:
        self = cls()
        provider = await cls.Provider.from_id(llm_id)

        if provider is None:
            return self

        for alias, modelinfo in provider.items():
            self[alias] = [(modelinfo, provider)]

        return self

    @lru_cache
    def lookup(self, key: str, provider_name: str):
        return [i for i in self[key] if provider_name == i[1].name]
    
    @lru_cache
    def features_only(self, *features: LlmFeature, raise_if_empty=True) -> Self:
        new = type(self)()
        new.tags.update(self.tags)

        for model, providers in self.items():
            if providers := [i for i in providers if i[1].features.issuperset(features)]:
                new.setdefault(model, []).extend(providers)

        if raise_if_empty and not new:
            msg = f"There are no providers with requested features: {', '.join(features)}"
            raise UnsupportedFeaturesError(msg, features=features)

        return new

    def merge(self, other: Self):
        for key, providers in other.items():
            self.setdefault(key, []).extend(providers)

        self.tags.update(other.tags)
    
