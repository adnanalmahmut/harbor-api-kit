import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import {
  createApiError,
  type ApiErrorExample,
} from '#src/infrastructure/http/decorators/api-errors.decorator.js';

/**
 * RBAC module API error examples for Swagger documentation
 */
export const RBAC_ERRORS = {
  // Roles
  listRoles: [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired')],

  createRole: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Role name is required'),
    createApiError(AppErrorCode.CONFLICT, 'Role already exists'),
  ],

  getRole: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
  ],

  updateRole: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Invalid input'),
    createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
    createApiError(AppErrorCode.CONFLICT, 'Role name already exists'),
  ],

  deleteRole: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
    createApiError(AppErrorCode.BAD_REQUEST, 'Cannot delete protected role'),
  ],

  // Permissions
  listPermissions: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
  ],

  createPermission: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(
      AppErrorCode.VALIDATION_ERROR,
      'Subject and action are required',
    ),
    createApiError(AppErrorCode.CONFLICT, 'Permission already exists'),
  ],

  getPermission: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'Permission not found'),
  ],

  updatePermission: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Invalid input'),
    createApiError(AppErrorCode.NOT_FOUND, 'Permission not found'),
    createApiError(AppErrorCode.CONFLICT, 'Permission key already exists'),
  ],

  deletePermission: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'Permission not found'),
  ],

  // Role-Permission assignments
  getRolePermissions: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
  ],

  addPermissionToRole: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Permission key is required'),
    createApiError(AppErrorCode.NOT_FOUND, 'Role or permission not found'),
    createApiError(AppErrorCode.CONFLICT, 'Permission already assigned'),
  ],

  removePermissionFromRole: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'Role or permission not found'),
  ],

  replaceRolePermissions: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(
      AppErrorCode.VALIDATION_ERROR,
      'Permissions array is required',
    ),
    createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
  ],
} as const satisfies Record<string, ApiErrorExample[]>;
