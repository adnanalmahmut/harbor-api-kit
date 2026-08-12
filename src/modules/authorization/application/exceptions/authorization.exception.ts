import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class AuthorizationException extends AppException {
  static missingPermission(permission: string) {
    return new AuthorizationException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'authorization.errors.missing_permission',
      details: { permission },
    });
  }

  static unauthorizedAccess() {
    return new AuthorizationException({
      code: AppErrorCode.UNAUTHORIZED,
      messageKey: 'authorization.errors.unauthorized',
      details: {},
    });
  }

  static databaseError(details?: Record<string, unknown>) {
    return new AuthorizationException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'authorization.errors.database_error',
      details,
    });
  }
}
