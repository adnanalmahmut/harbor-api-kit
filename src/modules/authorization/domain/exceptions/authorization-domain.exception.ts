import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class AuthorizationDomainException extends AppException {
  static invalidPermissionKey(key: string) {
    return new AuthorizationDomainException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'authorization.errors.invalid_permission_key',
      details: { key },
    });
  }
}
