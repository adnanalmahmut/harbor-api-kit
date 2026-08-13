import { AppException } from '#src/common/exceptions/app-exception.js';
import { AppErrorCode } from '#src/common/exceptions/error-definitions.js';

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

  static permissionOverrideNotFound(permissionKey?: string) {
    return new AuthorizationException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'authorization.errors.permission_override_not_found',
      details: permissionKey ? { permissionKey } : undefined,
    });
  }

  static invalidPermissionKey(key: string) {
    return new AuthorizationException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'authorization.errors.invalid_permission_key',
      details: { key },
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
