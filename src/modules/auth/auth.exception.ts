import { AppException } from '#src/common/exceptions/app-exception.js';
import { AppErrorCode } from '#src/common/exceptions/error-definitions.js';

/**
 * Errors raised by the application's own auth code — currently only `AuthGuard`.
 *
 * Errors produced by the Better Auth routes under `/auth/*` are NOT mapped here:
 * those routes are served by Better Auth's own handler and keep its error codes,
 * status codes and response shape. See docs/auth-authorization.md.
 */
export class AuthException extends AppException {
  static authenticationRequired() {
    return new AuthException({
      code: AppErrorCode.UNAUTHORIZED,
      messageKey: 'auth.errors.authentication_required',
    });
  }
}
