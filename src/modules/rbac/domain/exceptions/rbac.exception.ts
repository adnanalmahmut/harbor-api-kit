import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';

export class RbacException extends AppException {
  static forbidden() {
    return new RbacException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'errors.common.forbidden',
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
}
