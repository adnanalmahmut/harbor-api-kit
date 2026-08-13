import { AppException } from './app-exception.js';
import { AppErrorCode } from './error-definitions.js';

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
