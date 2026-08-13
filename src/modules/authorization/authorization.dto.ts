import {
  createApiError,
  type ApiResponseConfig,
} from '#src/common/api-errors.decorator.js';
import { AppErrorCode } from '#src/common/app-exception.js';
import { createStrictZodDto } from '#src/common/validation.pipe.js';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { isPermissionKey } from './permissions.catalog.js';

// --- Requests ---------------------------------------------------------------

export const SetUserPermissionOverrideSchema = z.object({
  permissionKey: z.string().refine(isPermissionKey),
  effect: z.enum(['ALLOW', 'DENY']),
  note: z.string().max(500).optional(),
});

export class SetPermissionOverrideDto extends createStrictZodDto(
  SetUserPermissionOverrideSchema,
) {}

export const ReplaceUserPermissionsSchema = z.object({
  overrides: z.array(
    z.object({
      permissionKey: z.string().refine(isPermissionKey),
      effect: z.enum(['ALLOW', 'DENY']),
      note: z.string().optional(),
    }),
  ),
});

export class ReplaceUserPermissionsDto extends createStrictZodDto(
  ReplaceUserPermissionsSchema,
) {}

// --- Responses --------------------------------------------------------------

export class PermissionKeyResponseDto {
  @ApiProperty({ example: 'user' })
  subject!: string;

  @ApiProperty({ example: 'list' })
  action!: string;
}

export class PermissionOverrideResponseDto {
  @ApiProperty({ type: PermissionKeyResponseDto })
  key!: PermissionKeyResponseDto;

  @ApiProperty({ enum: ['ALLOW', 'DENY'] })
  effect!: 'ALLOW' | 'DENY';

  @ApiProperty({ required: false, example: 'Temporary exception' })
  note?: string;
}

export class UserPermissionsResponseDto {
  @ApiProperty({
    type: [PermissionOverrideResponseDto],
    description: 'Allowed permissions',
  })
  allow!: PermissionOverrideResponseDto[];

  @ApiProperty({
    type: [PermissionOverrideResponseDto],
    description: 'Denied permissions',
  })
  deny!: PermissionOverrideResponseDto[];
}

export class EffectivePermissionsResponseDto {
  @ApiProperty({ type: [String], example: ['admin', 'user'] })
  roles!: string[];

  @ApiProperty({
    type: [String],
    example: ['user:list', 'user:create', 'user:update'],
  })
  permissions!: string[];
}

// --- Documented contract ----------------------------------------------------

const SESSION_EXPIRED = createApiError(
  AppErrorCode.UNAUTHORIZED,
  'Session expired',
);
const INSUFFICIENT = createApiError(
  AppErrorCode.FORBIDDEN,
  'Insufficient permissions',
);

export const USER_PERMISSIONS_RESPONSES = {
  getUserPermissions: {
    success: {
      status: HttpStatus.OK,
      message: 'User permissions fetched successfully',
      type: UserPermissionsResponseDto,
    },
    errors: [
      SESSION_EXPIRED,
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      INSUFFICIENT,
    ],
  },

  setPermissionOverride: {
    success: {
      status: HttpStatus.CREATED,
      message: 'Permission override set successfully',
    },
    errors: [
      SESSION_EXPIRED,
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'Permission key is required',
      ),
      createApiError(AppErrorCode.NOT_FOUND, 'User or permission not found'),
      INSUFFICIENT,
    ],
  },

  removePermissionOverride: {
    success: {
      status: HttpStatus.OK,
      message: 'Permission override removed successfully',
    },
    errors: [
      SESSION_EXPIRED,
      createApiError(
        AppErrorCode.NOT_FOUND,
        'User or permission override not found',
      ),
      INSUFFICIENT,
    ],
  },

  replaceUserPermissions: {
    success: {
      status: HttpStatus.OK,
      message: 'User permissions replaced successfully',
    },
    errors: [
      SESSION_EXPIRED,
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'Overrides array is required',
      ),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      INSUFFICIENT,
    ],
  },

  getEffectivePermissions: {
    success: {
      status: HttpStatus.OK,
      message: 'Effective permissions fetched successfully',
      type: EffectivePermissionsResponseDto,
    },
    errors: [
      SESSION_EXPIRED,
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
      INSUFFICIENT,
    ],
  },
} as const satisfies Record<string, ApiResponseConfig>;
