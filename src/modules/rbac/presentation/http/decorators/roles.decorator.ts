import { CONSTANTS_KEYS } from '#src/core/presentation/index.js';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = CONSTANTS_KEYS.ROLES;

export type RoleRequirement = {
  roles: string[];
  mode: 'AND' | 'ANY';
};

export const Roles = (roles: string[], mode: 'AND' | 'ANY' = 'ANY') =>
  SetMetadata(ROLES_KEY, { roles, mode });
