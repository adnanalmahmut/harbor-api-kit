import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class DatabaseException extends AppException {
  static conflict(message?: string) {
    return new DatabaseException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'core.errors.common.conflict',
      details: { message },
    });
  }

  static unknown(message?: string) {
    return new DatabaseException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'core.errors.common.internal',
      details: { message },
    });
  }
}
