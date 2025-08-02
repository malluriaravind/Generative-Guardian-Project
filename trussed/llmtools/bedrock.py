import boto3

from botocore.client import Config
from botocore.errorfactory import ClientError

from ..models.llm import Llm, BedrockOptions
from ..errors import ProviderConnectionError
from . import get_model_object


config = Config(connect_timeout=5, read_timeout=5)


def load_bedrock(options: BedrockOptions):
    client = boto3.client(
        service_name='bedrock',
        aws_access_key_id=options.access_key_id,
        aws_secret_access_key=options.access_key,
        region_name=options.region,
        config=config,
    )

    return load_bedrock_models(client)


async def load_bedrock_models(client):
    try:
        models = client.list_foundation_models().get('modelSummaries', [])
    except ClientError as e:
        message = e.response.get('Error', {}).get('Message') or str(e)
        raise ProviderConnectionError(message) from None

    modelobjects: list[Llm.ModelObject] = []

    for i in models:
        modelobjects.append(get_model_object(i['modelId']))

    return modelobjects
