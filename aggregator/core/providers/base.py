import dataclasses
import logging

from typing import *
from bson import ObjectId

from trussed.utils.dict import MyDict
from trussed.utils.cache import alru_cache
from trussed.models.systag import extract_tags
from trussed.models.llm import Llm, LlmProvider, LlmFeature

from core.errors import UnlistedModelError, UnknownProviderError


logger = logging.getLogger(__name__)


@dataclasses.dataclass(slots=True)
class ModelInfo:
    name: str
    alias: str
    price_input: float
    price_output: float
    tags: set[str]
    pool_id: ObjectId | None = None


class ProviderDict(MyDict[LlmProvider, 'BaseProvider']):
    def __missing__(self, name):
        logger.error(f"Unknown provider requested: {name}")
        raise UnknownProviderError(provider=name)


default_features = frozenset[LlmFeature](get_args(LlmFeature))


class BaseProvider(MyDict[str, ModelInfo]):
    name: ClassVar[LlmProvider]
    classes: ClassVar[ProviderDict[type['BaseProvider']]] = ProviderDict()
    features: ClassVar[frozenset[LlmFeature]] = default_features

    llm: Llm
    tags: set[str]

    def __init__(self, llm: Llm, tags: set[str]):
        self.llm = llm
        self.tags = tags

    def __missing__(self, model):
        logger.error(f"Unlisted model requested: {model}")
        raise UnlistedModelError(model=model)

    def __str__(self):
        return f'{self.name} <{self.llm.name}>'

    @classmethod
    def register(cls, provider: type['BaseProvider']):
        logger.debug(f"Registering provider: {provider.name}")
        cls.classes[provider.name] = provider

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        logger.exception("An exception occurred", exc_info=e)
        return e

    async def initialize(self) -> Self | None:
        ...

    @classmethod
    @alru_cache(ttl=60)
    async def from_id_cached(cls, llm_id: ObjectId) -> Self | None:
        logger.debug(f"Fetching provider from cache with LLM ID: {llm_id}")
        return await cls.from_id(llm_id)

    @classmethod
    async def from_id(cls, llm_id: ObjectId) -> Self | None:
        logger.info(f"Fetching LLM with ID: {llm_id}")
        llm = await Llm.find_one(Llm.id == llm_id, Llm.status != 'Disabled')

        if not llm:
            logger.warning(f"LLM with ID {llm_id} not found or is disabled")
            return None

        try:
            self = cls.classes[llm.provider](llm, extract_tags(llm))
            logger.info("Created provider instance %s with tags %s", self, self.tags)
        except KeyError:
            logger.error(f"Provider {llm.provider} not registered")
            raise UnknownProviderError(provider=llm.provider)

        for model in self.llm.models:
            if model['enabled']:
                model_info = ModelInfo(
                    name=model['name'],
                    alias=model['alias'],
                    price_input=model['price_input'],
                    price_output=model['price_output'],
                    tags=self.tags,
                )
                self[model['alias']] = model_info
                logger.debug(f"Added model info: {model_info}")

        result = await self.initialize()
    
        if result:
            logger.debug("Provider initialized successfully with additional data")
            return result
        else:
            logger.debug("Provider initialized successfully")
            return self
