import type { PermissionKey } from '../permissions.catalog.js';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'authorization:permissions';

export type PermissionRequirement = {
  permissions: readonly PermissionKey[];
  mode: 'AND' | 'ANY';
};

export const Permissions = (
  permissions: readonly PermissionKey[],
  mode: 'AND' | 'ANY' = 'AND',
) => SetMetadata(PERMISSIONS_KEY, { permissions, mode });
