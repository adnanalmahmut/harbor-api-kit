import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class AuthException extends AppException {
  static authenticationRequired() {
    return new AuthException({
      code: AppErrorCode.UNAUTHORIZED,
      messageKey: 'auth.errors.authentication_required',
    });
  }

  static sessionExpired() {
    return new AuthException({
      code: AppErrorCode.UNAUTHORIZED,
      messageKey: 'auth.errors.session_expired',
    });
  }

  static invalidToken() {
    return new AuthException({
      code: AppErrorCode.UNAUTHORIZED,
      messageKey: 'auth.errors.invalid_token',
    });
  }

  static invalidCredentials() {
    return new AuthException({
      code: AppErrorCode.UNAUTHORIZED,
      messageKey: 'auth.errors.invalid_credentials',
    });
  }

  static emailAlreadyExists() {
    return new AuthException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'auth.errors.email_already_exists',
    });
  }

  static emailNotVerified() {
    return new AuthException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'auth.errors.email_not_verified',
    });
  }

  static invalidEmail() {
    return new AuthException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'auth.errors.validation.email.invalid',
    });
  }

  static passwordIncorrect() {
    return new AuthException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'auth.errors.password_incorrect',
    });
  }

  static sessionNotFound() {
    return new AuthException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'auth.errors.session_not_found',
    });
  }

  static accountNotFound() {
    return new AuthException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'auth.errors.account_not_found',
    });
  }

  static invalidProvider() {
    return new AuthException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'auth.errors.invalid_provider',
    });
  }

  static invalidRequest() {
    return new AuthException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'auth.errors.invalid_request',
    });
  }

  static tooManyRequests() {
    return new AuthException({
      code: AppErrorCode.TOO_MANY_REQUESTS,
      messageKey: 'auth.errors.too_many_requests',
    });
  }

  static conflict() {
    return new AuthException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'auth.errors.conflict',
    });
  }

  static notFound() {
    return new AuthException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'auth.errors.not_found',
    });
  }

  static userNotFound() {
    return new AuthException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'auth.errors.user_not_found',
    });
  }

  static internalError() {
    return new AuthException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'auth.errors.internal_error',
    });
  }

  static unauthorized() {
    return AuthException.authenticationRequired();
  }

  static emailAlreadyVerified() {
    return new AuthException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'auth.errors.email_already_verified',
    });
  }
}
