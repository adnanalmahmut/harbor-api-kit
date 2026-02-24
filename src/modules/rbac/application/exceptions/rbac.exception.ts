import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class RbacException extends AppException {
  static forbidden() {
    return new RbacException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'rbac.errors.forbidden',
      details: {},
    });
  }

  static roleNotFound(id: string) {
    return new RbacException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'rbac.errors.role_not_found',
      details: { id },
    });
  }

  static roleAlreadyExists(slug: string) {
    return new RbacException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'rbac.errors.role_already_exists',
      details: { slug },
    });
  }

  static permissionNotFound(id: string) {
    return new RbacException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'rbac.errors.permission_not_found',
      details: { id },
    });
  }

  static permissionAlreadyExists(key: string) {
    return new RbacException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'rbac.errors.permission_already_exists',
      details: { key },
    });
  }

  static roleInUse(id: string) {
    return new RbacException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'rbac.errors.role_in_use',
      details: { id },
    });
  }

  static permissionInUse(id: string) {
    return new RbacException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'rbac.errors.permission_in_use',
      details: { id },
    });
  }

  static missingPermission(permission: string) {
    return new RbacException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'rbac.errors.missing_permission',
      details: { permission },
    });
  }

  static missingRole(role: string) {
    return new RbacException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'rbac.errors.missing_role',
      details: { role },
    });
  }

  static unauthorizedAccess() {
    return new RbacException({
      code: AppErrorCode.UNAUTHORIZED,
      messageKey: 'rbac.errors.unauthorized',
      details: {},
    });
  }
  static databaseError(details?: Record<string, any>) {
    return new RbacException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'rbac.errors.database_error',
      details,
    });
  }
}
