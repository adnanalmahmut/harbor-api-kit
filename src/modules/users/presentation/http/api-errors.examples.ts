import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import {
  createApiError,
  type ApiErrorExample,
} from '#src/infrastructure/http/decorators/api-errors.decorator.js';

/**
 * Users module API error examples for Swagger documentation
 */
export const USERS_ERRORS = {
  findAll: [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired')],

  create: [
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required'),
    createApiError(AppErrorCode.CONFLICT, 'User already exists'),
  ],

  findById: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],

  update: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Invalid input'),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],

  getUserRoles: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],

  addRoleToUser: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Role name is required'),
    createApiError(AppErrorCode.NOT_FOUND, 'User or role not found'),
    createApiError(AppErrorCode.CONFLICT, 'Role already assigned'),
  ],

  removeRoleFromUser: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'User or role not found'),
  ],

  replaceUserRoles: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Roles array is required'),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],

  getUserPermissions: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],

  setPermissionOverride: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.VALIDATION_ERROR, 'Permission key is required'),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],

  removePermissionOverride: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'User or permission not found'),
  ],

  replaceUserPermissions: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(
      AppErrorCode.VALIDATION_ERROR,
      'Permissions array is required',
    ),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],

  getEffectivePermissions: [
    createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
  ],
} as const satisfies Record<string, ApiErrorExample[]>;
