import logging
import attrs

from http import HTTPStatus
from datetime import timedelta
from typing import TypedDict, ClassVar, Literal


log = logging.getLogger(__name__)


@attrs.define(slots=False, eq=False)
class BaseApiException(Exception):
    default_message: ClassVar[str] = ''

    message: str = 'An exception has occured'
    http_code: int = HTTPStatus.INTERNAL_SERVER_ERROR

    def __init_subclass__(cls):
        cls.default_message = cls.message
    
    def __attrs_post_init__(self):
        # User-provided (non-default) messages should not be formatted
        if self.message is self.default_message:
            self.message = self.default_message.format_map(self.__dict__)

    @property
    def response_body(self) -> dict[str]:
        return {}

    @property
    def response_headers(self) -> dict[str, str]:
        return {}


@attrs.define(slots=False, eq=False)
class InstantApiResponse(BaseApiException):
    message: str = 'An instant response thrown'
    http_code: int = HTTPStatus.OK
    body: dict | None = None
    headers: dict | None = None

    @property
    def response_body(self) -> dict[str]:
        return self.body or {}

    @property
    def response_headers(self) -> dict[str, str]:
        return self.headers or {}


@attrs.define(slots=False, eq=False)
class ApiException(BaseApiException):
    prefix: ClassVar[str] = 'TC_ERROR: '

    message: str = 'An error has occured'
    http_code: int = HTTPStatus.INTERNAL_SERVER_ERROR
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None

    class Error(TypedDict):
        message: str
        type: set
        http_code: str
        param: str | None

    @property
    def response_body(self) -> dict[Literal['error'], Error]:
        return {
            'error': {
                'message': self.prefix + self.message,
                'type': self.openai_type,
                'code': self.openai_code,
                'param': None,
            }
        }

    def __str__(self):
        return f'{self.__class__.__name__}: {self.message}'


@attrs.define(slots=False, eq=False)
class ProviderError(ApiException):
    prefix: ClassVar[str] = 'TC_PROVIDER_ERROR: '

    message: str = 'Something went wrong on the LLM provider side'
    http_code: int = HTTPStatus.BAD_REQUEST
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None

    llm_response_time: float = 0
    llm_response_body: dict | None = None


@attrs.define(slots=False, eq=False)
class NotFoundError(ApiException):
    message: str = 'Object does not exist'
    http_code: int = HTTPStatus.NOT_FOUND
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None


@attrs.define(slots=False, eq=False)
class AuthorizationError(ApiException):
    message: str = 'Unauthorized'
    http_code: int = HTTPStatus.UNAUTHORIZED
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None


@attrs.define(slots=False, eq=False)
class InvalidApiKeyError(ApiException):
    message: str = 'Incorrect API key provided'
    http_code: int = HTTPStatus.UNAUTHORIZED
    openai_code: str = 'invalid_api_key'
    openai_type: str | None = None


@attrs.define(slots=False, eq=False)
class ExpiredApiKeyError(InvalidApiKeyError):
    message: str = 'Expired API key provided'
    http_code: int = HTTPStatus.UNAUTHORIZED
    openai_code: str = 'expired_api_key'
    openai_type: str | None = None


@attrs.define(slots=False, eq=False)
class MissingApiKeyError(InvalidApiKeyError):
    message: str = ('API key not provided. You need to provide your API key in an Authorization header '
                   'using Bearer scheme (i.e. Authorization: Bearer YOUR_KEY)')
    http_code: int = HTTPStatus.UNAUTHORIZED
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None


@attrs.define(slots=False, eq=False)
class UnbudgetedApiKeyError(ApiException):
    message: str = 'API key is suspended for {delta} due to exceeding budget configured on Trussed Controller'
    http_code: int = HTTPStatus.TOO_MANY_REQUESTS
    openai_code: str = 'configured_budget_exceeded'
    openai_type: str = 'insufficient_quota'

    delta: timedelta = attrs.field(kw_only=True)


@attrs.define(slots=False, eq=False)
class UnbudgetedLlmError(ApiException):
    message: str = 'LLM is suspended for {delta} due to exceeding budget configured on Trussed Controller'
    http_code: int = HTTPStatus.TOO_MANY_REQUESTS
    openai_code: str = 'configured_budget_exceeded'
    openai_type: str = 'insufficient_quota'

    delta: timedelta = attrs.field(kw_only=True)


@attrs.define(slots=False, eq=False)
class PromptLimitError(ApiException):
    message: str = 'Prompt larger than {limit} tokens configured on Trussed Controller'
    http_code: int = HTTPStatus.TOO_MANY_REQUESTS
    openai_code: str = 'configured_prompt_limit_exceeded'
    openai_type: str = 'insufficient_quota'

    limit: int = attrs.field(kw_only=True)


@attrs.define(slots=False, eq=False)
class UnlistedModelError(ApiException):
    message: str = "Model '{model}' is not listed in LLM access list nor model pool"
    http_code: int = HTTPStatus.NOT_FOUND
    openai_code: str = 'model_not_found'
    openai_type: str = 'invalid_request_error'

    model: str = attrs.field(kw_only=True)


@attrs.define(slots=False, eq=False)
class UnsupportedFeaturesError(ApiException):
    message: str = "There are no providers with requested features {features}"
    http_code: int = HTTPStatus.NOT_FOUND
    openai_code: str = 'model_not_found'
    openai_type: str = 'invalid_request_error'

    features: tuple[str, ...] = attrs.field(kw_only=True)


@attrs.define(slots=False, eq=False)
class UnknownProviderError(ApiException):
    message: str = "Provider '{provider}' is not configured or unknown"
    http_code: int = HTTPStatus.NOT_FOUND
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None

    provider: str = attrs.field(kw_only=True)


@attrs.define(slots=False, eq=False)
class PolicyIsNotReadyError(ApiException):
    message: str = 'Policy is being prepared. Please wait a bit and try again'
    http_code: int = HTTPStatus.SERVICE_UNAVAILABLE
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None


@attrs.define(slots=False, eq=False)
class ResourceIsNotReadyError(ApiException):
    message: str = 'Resource is being prepared. Please wait a bit and try again'
    http_code: int = HTTPStatus.SERVICE_UNAVAILABLE
    openai_type: str | None = 'invalid_request_error'
    openai_code: str | None = None


@attrs.define(slots=False, eq=False)
class TooManyRequestsError(ApiException):
    message: str = ('Exceeded rate limit {rate_requests}/{rate_period} configured on Trussed Controller. '
                   'Please wait {retry_after:.1f} seconds and try again')
    http_code: int = HTTPStatus.TOO_MANY_REQUESTS
    openai_code: str = 'rate_limit_exceeded'
    openai_type: str = 'invalid_request_error'

    rate_requests: int = attrs.field(kw_only=True)
    rate_period: str = attrs.field(kw_only=True)
    retry_after: float = attrs.field(kw_only=True)

    @property
    def response_headers(self) -> dict[str, str]:
        return {'Retry-After': f'{self.retry_after:.0f}'}


@attrs.define(slots=False, eq=False)
class InvisibleTextError(ApiException):
    message: str = 'Invisible text injection attempt'
    http_code: int = HTTPStatus.BAD_REQUEST
    openai_code: str = 'invisible_text'
    openai_type: str = 'poisoned_prompt'


@attrs.define(slots=False, eq=False)
class UnallowedLanguageError(ApiException):
    message: str = 'Unallowed prompt language(s) detected'
    http_code: int = HTTPStatus.BAD_REQUEST
    openai_code: str = 'unallowed_language'
    openai_type: str = 'poisoned_prompt'


@attrs.define(slots=False, eq=False)
class PromptInjectionError(ApiException):
    message: str = 'Prompt injection detected'
    http_code: int = HTTPStatus.BAD_REQUEST
    openai_code: str = 'prompt_injection'
    openai_type: str = 'poisoned_prompt'


@attrs.define(slots=False, eq=False)
class ForbiddenTopicError(ApiException):
    message: str = 'Forbidden topic detected'
    http_code: int = HTTPStatus.BAD_REQUEST
    openai_code: str = 'forbidden_topic'
    openai_type: str = 'invalid_request_error'
