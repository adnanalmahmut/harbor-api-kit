import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';

export class SecurityException extends AppException {
  static csrf() {
    return new SecurityException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'errors.security.csrf',
    });
  }

  static rateLimitExceeded() {
    return new SecurityException({
      code: AppErrorCode.TOO_MANY_REQUESTS,
      messageKey: 'errors.security.rate_limit',
    });
  }
}
