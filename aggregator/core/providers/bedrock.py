import logging
import httpx
import litellm
import boto3

from typing import *
from dataclasses import dataclass
from botocore.errorfactory import ClientError

from core.errors import ProviderError
from . import Provider, Context, ChatCompletionCreate, LiteLlmTrackingMixin
from . import find_first_exception


logger = logging.getLogger(__name__)


@dataclass
class OpenAiTypeCode:
    type: str = 'invalid_request_error'
    code: str | None = None


aws_to_openai = {
    'AccessDeniedException': OpenAiTypeCode('permission_error'),
    'ResourceNotFoundException': OpenAiTypeCode('invalid_request_error'),
    'ValidationException': OpenAiTypeCode('invalid_request_error'),
    'ThrottlingException': OpenAiTypeCode('rate_limit_exceeded'),
    'ServiceQuotaExceededException': OpenAiTypeCode('insufficient_quota', 'insufficient_quota'),
}


class LiteLlmBedrockProviderBase(Provider):
    name = 'Bedrock'
    sdk: Any
    modelmap: dict[str, str]

    async def initialize(self):
        assert self.llm.bedrock, f'The {self.name} LLM does not have provider options'

        # Legacy
        self.sdk = boto3.client(
            service_name='bedrock-runtime',
            aws_access_key_id=self.llm.bedrock.access_key_id,
            aws_secret_access_key=self.llm.bedrock.access_key,
            region_name=self.llm.bedrock.region,
            endpoint_url=self.llm.bedrock.auto_endpoint_url,
        )
        self.modelmap = {}

    async def completion(self, ctx: Context, **kwargs: Unpack[ChatCompletionCreate]):
        model = kwargs['model']
        kwargs['model'] = self.modelmap.get(model, model)

        def invoke():
            return litellm.acompletion(
                aws_access_key_id=self.llm.bedrock.access_key_id,
                aws_secret_access_key=self.llm.bedrock.access_key,
                aws_region_name=self.llm.bedrock.region,
                timeout=self.llm.bedrock.timeout,
                custom_llm_provider='bedrock',
                **kwargs,
            )

        try:
            try:
                with ctx.response_time:
                    return await invoke()

            except Exception as e:
                prefix = self.llm.bedrock.region_model_prefix

                if 'ID or ARN of an inference profile' in str(e) and prefix:
                    kwargs['model'] = prefix + kwargs['model']
                    logger.warning(
                        'Trying to use the inference profileby prefixing the model: %s', kwargs['model']
                    )

                    with ctx.response_time:
                        response = await invoke()

                    self.modelmap[model] = kwargs['model']
                    return response

                raise

        except Exception as e:
            raise self.exception(e) from None

    @classmethod
    def exception(cls, e: Exception) -> Exception:
        if httpx_error := find_first_exception(e, httpx.HTTPStatusError):
            try:
                payload = httpx_error.response.json()
                message = payload.get('message') or str(httpx_error)

            except ValueError:
                message = str(httpx_error)

            error = ProviderError(message, http_code=httpx_error.response.status_code)
            return error

        # Legacy check
        if native := find_first_exception(e, ClientError):
            error = native.response.get('Error', {})
            meta = native.response.get('ResponseMetadata', {})

            generic = ProviderError(message=error.get('Message') or repr(native))
            generic.http_code = meta.get('HTTPStatusCode') or 400

            typecode = aws_to_openai.get(error.get('Code')) or OpenAiTypeCode()
            generic.openai_type = typecode.type
            generic.openai_code = typecode.code

            return generic

        return e


class LiteLlmBedrockProvider(LiteLlmTrackingMixin, LiteLlmBedrockProviderBase): ...
