import {
  AppErrorCode,
  createApiError,
  createApiResponseConfig,
  createApiSuccess,
  type ApiResponseConfig,
} from '#src/core/index.js';
import { HttpStatus } from '@nestjs/common';
import {
  EffectivePermissionsResponseDto,
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
        'Permission key is required',
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
  getUserPermissions: USERS_RESPONSES.getUserPermissions.errors,
  setPermissionOverride: USERS_RESPONSES.setPermissionOverride.errors,
  removePermissionOverride: USERS_RESPONSES.removePermissionOverride.errors,
  replaceUserPermissions: USERS_RESPONSES.replaceUserPermissions.errors,
  getEffectivePermissions: USERS_RESPONSES.getEffectivePermissions.errors,
};
