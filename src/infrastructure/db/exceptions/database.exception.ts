import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';

export class DatabaseException extends AppException {
  static conflict(message?: string) {
    return new DatabaseException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'errors.common.conflict',
      details: { message },
    });
  }

  static unknown(message?: string) {
    return new DatabaseException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'errors.common.internal',
      details: { message },
    });
  }
}
