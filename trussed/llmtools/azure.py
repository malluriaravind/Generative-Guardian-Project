from openai import AsyncAzureOpenAI

from ..models.llm import AzureOptions
from .openai import load_openai_models, http_client


def load_azure(options: AzureOptions):
    client = AsyncAzureOpenAI(
        api_key=options.api_key,
        azure_endpoint=options.endpoint,
        # To request a list of models, don't pass the deployment name
        # azure_deployment=options.deployment,
        api_version=options.version,
        http_client=http_client,
    )

    return load_openai_models(client.models)
