import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type RoleRequirement = {
  roles: string[];
  mode: 'AND' | 'ANY';
};

export const Roles = (roles: string[], mode: 'AND' | 'ANY' = 'ANY') =>
  SetMetadata(ROLES_KEY, { roles, mode });
