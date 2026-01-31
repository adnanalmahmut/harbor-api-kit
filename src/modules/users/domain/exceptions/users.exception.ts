import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';

export class UsersException extends AppException {
  static conflict() {
    return new UsersException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'users.errors.common.conflict',
    });
  }
}
