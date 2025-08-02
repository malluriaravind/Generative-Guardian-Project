from ..amlscore import ChatScoreClient, PromptScoreClient, EmbeddingScoreClient
from ..models.llm import CustomProviderOptions
from ..errors import ProviderConnectionError


async def load_amlchatscore(options: CustomProviderOptions):
    client = ChatScoreClient.from_options(options)
    return []


async def load_amlpromptscore(options: CustomProviderOptions):
    client = PromptScoreClient.from_options(options)
    return []


async def load_amlembeddingscore(options: CustomProviderOptions):
    client = EmbeddingScoreClient.from_options(options)
    return []
