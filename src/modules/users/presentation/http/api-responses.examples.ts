import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import {
  createApiError,
  createApiResponseConfig,
  createApiSuccess,
  type ApiResponseConfig,
} from '#src/infrastructure/http/decorators/api-errors.decorator.js';
import { HttpStatus } from '@nestjs/common';
import {
  EffectivePermissionsResponseDto,
  RoleResponseDto,
  UserPermissionsResponseDto,
  UserResponseDto,
} from './dtos/users-response.dto.js';

/**
 * Users module API response examples for Swagger documentation
 * Each endpoint has both success response and possible error responses
 */
export const USERS_RESPONSES = {
  findAll: createApiResponseConfig(
    createApiSuccess('Users fetched successfully', HttpStatus.OK, undefined, [
      UserResponseDto,
    ]),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  create: createApiResponseConfig(
    createApiSuccess(
      'User created successfully',
      HttpStatus.CREATED,
      undefined,
      UserResponseDto,
    ),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required'),
      createApiError(AppErrorCode.CONFLICT, 'Email already exists'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  findById: createApiResponseConfig(
    createApiSuccess(
      'User fetched successfully',
      HttpStatus.OK,
      undefined,
      UserResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  update: createApiResponseConfig(
    createApiSuccess('User updated successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Invalid input'),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  // User Roles Management
  getUserRoles: createApiResponseConfig(
    createApiSuccess(
      'User roles fetched successfully',
      HttpStatus.OK,
      undefined,
      [RoleResponseDto],
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  addRoleToUser: createApiResponseConfig(
    createApiSuccess('Role added to user successfully', HttpStatus.CREATED),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Role ID is required'),
      createApiError(AppErrorCode.NOT_FOUND, 'User or role not found'),
      createApiError(AppErrorCode.CONFLICT, 'Role already assigned'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  removeRoleFromUser: createApiResponseConfig(
    createApiSuccess('Role removed from user successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'User or role not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  replaceUserRoles: createApiResponseConfig(
    createApiSuccess('User roles replaced successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Roles array is required'),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  // User Permissions Management
  getUserPermissions: createApiResponseConfig(
    createApiSuccess(
      'User permissions fetched successfully',
      HttpStatus.OK,
      undefined,
      UserPermissionsResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  setPermissionOverride: createApiResponseConfig(
    createApiSuccess(
      'Permission override set successfully',
      HttpStatus.CREATED,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'Permission ID is required',
      ),
      createApiError(AppErrorCode.NOT_FOUND, 'User or permission not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  removePermissionOverride: createApiResponseConfig(
    createApiSuccess('Permission override removed successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(
        AppErrorCode.NOT_FOUND,
        'User or permission override not found',
      ),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  replaceUserPermissions: createApiResponseConfig(
    createApiSuccess('User permissions replaced successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'Overrides array is required',
      ),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  getEffectivePermissions: createApiResponseConfig(
    createApiSuccess(
      'Effective permissions fetched successfully',
      HttpStatus.OK,
      undefined,
      EffectivePermissionsResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),
} as const satisfies Record<string, ApiResponseConfig>;

export const USERS_ERRORS = {
  findAll: USERS_RESPONSES.findAll.errors,
  create: USERS_RESPONSES.create.errors,
  findById: USERS_RESPONSES.findById.errors,
  update: USERS_RESPONSES.update.errors,
  getUserRoles: USERS_RESPONSES.getUserRoles.errors,
  addRoleToUser: USERS_RESPONSES.addRoleToUser.errors,
  removeRoleFromUser: USERS_RESPONSES.removeRoleFromUser.errors,
  replaceUserRoles: USERS_RESPONSES.replaceUserRoles.errors,
  getUserPermissions: USERS_RESPONSES.getUserPermissions.errors,
  setPermissionOverride: USERS_RESPONSES.setPermissionOverride.errors,
  removePermissionOverride: USERS_RESPONSES.removePermissionOverride.errors,
  replaceUserPermissions: USERS_RESPONSES.replaceUserPermissions.errors,
  getEffectivePermissions: USERS_RESPONSES.getEffectivePermissions.errors,
};
