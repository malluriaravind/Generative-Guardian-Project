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


class InvalidLoginError(ApiException):
    code = 422
    message = 'Incorrect email or password'


class InvalidOldPasswordError(ApiException):
    code = 400
    message = "Old password isn't valid"


class AccountDuplicationError(ApiException):
    code = 403
    message = 'Record already exist'


class UserNotFoundError(ApiException):
    code = 404
    message = 'User not found'


class ProviderError(ApiException):
    code = 400


class AliasAlreadyExistError(ApiException):
    code = 422


class TooManyAuthTokensError(ApiException):
    code = 400
    message = 'Token limit reached. Delete some unused ones and try again'
