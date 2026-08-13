import {
  type ApiResponseConfig,
  createApiError,
  createApiResponseConfig,
  createApiSuccess,
} from '#src/common/api-errors.decorator.js';
import { AppErrorCode } from '#src/common/app-exception.js';
import { HttpStatus } from '@nestjs/common';
import {
  EffectivePermissionsResponseDto,
  UserPermissionsResponseDto,
} from './user-permissions-response.dto.js';

/**
 * Authorization module API response examples for Swagger documentation.
 * Each endpoint has both success response and possible error responses.
 */
export const USER_PERMISSIONS_RESPONSES = {
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
