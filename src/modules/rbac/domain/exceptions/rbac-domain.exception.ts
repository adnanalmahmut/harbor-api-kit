import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class RbacDomainException extends AppException {
  static invalidPermissionKey(key: string) {
    return new RbacDomainException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'rbac.errors.invalid_permission_key',
      details: { key },
    });
  }
}
