import {
  AppErrorCode,
  createApiError,
  createApiResponseConfig,
  createApiSuccess,
  type ApiResponseConfig,
} from '#src/core/index.js';
import { HttpStatus } from '@nestjs/common';
import {
  PermissionResponseDto,
  RolePermissionsResponseDto,
  RoleResponseDto,
  RoleWithPermissionsResponseDto,
} from './dtos/rbac-response.dto.js';

/**
 * RBAC module API response examples for Swagger documentation
 * Each endpoint has both success response and possible error responses
 */
export const RBAC_RESPONSES = {
  // Roles
  listRoles: createApiResponseConfig(
    createApiSuccess('Roles fetched successfully', HttpStatus.OK, undefined, [
      RoleResponseDto,
    ]),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  createRole: createApiResponseConfig(
    createApiSuccess(
      'Role created successfully',
      HttpStatus.CREATED,
      undefined,
      RoleResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Role name is required'),
      createApiError(AppErrorCode.CONFLICT, 'Role already exists'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  getRole: createApiResponseConfig(
    createApiSuccess(
      'Role fetched successfully',
      HttpStatus.OK,
      undefined,
      RoleWithPermissionsResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  updateRole: createApiResponseConfig(
    createApiSuccess('Role updated successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Invalid input'),
      createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
      createApiError(AppErrorCode.CONFLICT, 'Role name already exists'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  deleteRole: createApiResponseConfig(
    createApiSuccess('Role deleted successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
      createApiError(AppErrorCode.BAD_REQUEST, 'Cannot delete protected role'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  // Permissions
  listPermissions: createApiResponseConfig(
    createApiSuccess(
      'Permissions fetched successfully',
      HttpStatus.OK,
      undefined,
      [PermissionResponseDto],
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  createPermission: createApiResponseConfig(
    createApiSuccess(
      'Permission created successfully',
      HttpStatus.CREATED,
      undefined,
      PermissionResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'Subject and action are required',
      ),
      createApiError(AppErrorCode.CONFLICT, 'Permission already exists'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  getPermission: createApiResponseConfig(
    createApiSuccess(
      'Permission fetched successfully',
      HttpStatus.OK,
      undefined,
      PermissionResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'Permission not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  updatePermission: createApiResponseConfig(
    createApiSuccess('Permission updated successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Invalid input'),
      createApiError(AppErrorCode.NOT_FOUND, 'Permission not found'),
      createApiError(AppErrorCode.CONFLICT, 'Permission key already exists'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  deletePermission: createApiResponseConfig(
    createApiSuccess('Permission deleted successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'Permission not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  // Role-Permission assignments
  getRolePermissions: createApiResponseConfig(
    createApiSuccess(
      'Role permissions fetched successfully',
      HttpStatus.OK,
      undefined,
      RolePermissionsResponseDto,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  addPermissionToRole: createApiResponseConfig(
    createApiSuccess(
      'Permission added to role successfully',
      HttpStatus.CREATED,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'Permission ID is required',
      ),
      createApiError(AppErrorCode.NOT_FOUND, 'Role or permission not found'),
      createApiError(AppErrorCode.CONFLICT, 'Permission already assigned'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  removePermissionFromRole: createApiResponseConfig(
    createApiSuccess(
      'Permission removed from role successfully',
      HttpStatus.OK,
    ),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'Role or permission not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),

  replaceRolePermissions: createApiResponseConfig(
    createApiSuccess('Role permissions replaced successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'Permissions array is required',
      ),
      createApiError(AppErrorCode.NOT_FOUND, 'Role not found'),
      createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'),
    ],
  ),
} as const satisfies Record<string, ApiResponseConfig>;

export const RBAC_ERRORS = {
  listRoles: RBAC_RESPONSES.listRoles.errors,
  createRole: RBAC_RESPONSES.createRole.errors,
  getRole: RBAC_RESPONSES.getRole.errors,
  updateRole: RBAC_RESPONSES.updateRole.errors,
  deleteRole: RBAC_RESPONSES.deleteRole.errors,
  listPermissions: RBAC_RESPONSES.listPermissions.errors,
  createPermission: RBAC_RESPONSES.createPermission.errors,
  getPermission: RBAC_RESPONSES.getPermission.errors,
  updatePermission: RBAC_RESPONSES.updatePermission.errors,
  deletePermission: RBAC_RESPONSES.deletePermission.errors,
  getRolePermissions: RBAC_RESPONSES.getRolePermissions.errors,
  addPermissionToRole: RBAC_RESPONSES.addPermissionToRole.errors,
  removePermissionFromRole: RBAC_RESPONSES.removePermissionFromRole.errors,
  replaceRolePermissions: RBAC_RESPONSES.replaceRolePermissions.errors,
};
