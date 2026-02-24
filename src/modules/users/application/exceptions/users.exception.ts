import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class UsersException extends AppException {
  /**
   * User not found (404)
   */
  static userNotFound(userId?: string) {
    return new UsersException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'users.errors.user_not_found',
      details: userId ? { userId } : undefined,
    });
  }

  /**
   * Email already exists / conflict (409)
   */
  static emailAlreadyExists(email?: string) {
    return new UsersException({
      code: AppErrorCode.CONFLICT,
      messageKey: 'users.errors.email_already_exists',
      details: email ? { email } : undefined,
    });
  }

  /**
   * @deprecated Use emailAlreadyExists() instead
   */
  static conflict() {
    return UsersException.emailAlreadyExists();
  }

  /**
   * Cannot modify self (403) - e.g., admin cannot delete own account
   */
  static cannotModifySelf() {
    return new UsersException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'users.errors.cannot_modify_self',
    });
  }

  /**
   * Role not assigned to user (404)
   */
  static roleNotAssigned(roleId?: string) {
    return new UsersException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'users.errors.role_not_assigned',
      details: roleId ? { roleId } : undefined,
    });
  }

  /**
   * Permission override not found (404)
   */
  static permissionOverrideNotFound(permissionId?: string) {
    return new UsersException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'users.errors.permission_override_not_found',
      details: permissionId ? { permissionId } : undefined,
    });
  }

  /**
   * Invalid user data (400)
   */
  static invalidUserData(field?: string) {
    return new UsersException({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey: 'users.errors.invalid_user_data',
      details: field ? { field } : undefined,
    });
  }
}
