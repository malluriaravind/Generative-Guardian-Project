class ApiException(Exception):
    """JSON-compatible domain exceptions"""

    code = 500
    message = 'An error has occured'

    def __init__(self, message='', *args, **kwargs):
        classname = self.__class__.__name__
        message = message or self.message

        self.json = {'error': classname, 'message': message, **kwargs}
        self.args = (message, *args)


class NotFoundError(ApiException):
    code = 404
    message = 'Object does not exist'


class AuthorizationError(ApiException):
    code = 401
    message = 'Unauthorized'


class ForbiddenError(ApiException):
    code = 403
    message = 'Forbidden'


class InvalidScopesError(ForbiddenError):
    code = 403
    message = 'You do not have access to use these scopes'


class InvalidPermissionsError(ForbiddenError):
    code = 403
    message = 'You do not have access to use these permissions'


class InvalidLoginError(ApiException):
    code = 401
    message = 'Incorrect email or password'


class InvalidOldPasswordError(ApiException):
    code = 400
    message = "Old password isn't valid"


class AccountDuplicationError(ApiException):
    code = 403
    message = 'Record already exist'


class ProviderError(ApiException):
    code = 400


class RoleAlreadyExistError(ApiException):
    message = 'The role already exists'
    code = 422


class AliasAlreadyExistError(ApiException):
    message = 'The alias already exists'
    code = 422


class AppKeyAlreadyExistError(ApiException):
    message = 'An application with this key already exists'
    code = 422


class PiiEntityAlreadyExistError(ApiException):
    code = 422
    message = 'PII entity already exist'


class AlreadyBudgetedError(ApiException):
    code = 422


class ProviderConnectionError(ApiException):
    code = 400
    message = 'Failed to establish connection'


class ProviderIsNotReadyError(ApiException):
    code = 400
    message = 'Provider is not yet configured'
