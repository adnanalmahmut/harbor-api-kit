import { CONSTANTS_KEYS } from '#src/core/presentation/http/constants/metadata-keys.constants.js';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = CONSTANTS_KEYS.PERMISSIONS;

export type PermissionRequirement = {
  permissions: string[];
  mode: 'AND' | 'ANY';
};

export const Permissions = (
  permissions: string[],
  mode: 'AND' | 'ANY' = 'AND',
) => SetMetadata(PERMISSIONS_KEY, { permissions, mode });
