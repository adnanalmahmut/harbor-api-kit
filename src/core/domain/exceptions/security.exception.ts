import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/domain/exceptions/error-definitions.js';

export class SecurityException extends AppException {
  static csrf() {
    return new SecurityException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'core.errors.security.csrf',
    });
  }

  static rateLimitExceeded() {
    return new SecurityException({
      code: AppErrorCode.TOO_MANY_REQUESTS,
      messageKey: 'core.errors.security.rate_limit',
    });
  }
}
