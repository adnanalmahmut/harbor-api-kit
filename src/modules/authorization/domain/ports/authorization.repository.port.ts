import type { UserPermissionOverride } from '../value-objects/user-permission-override.vo.js';

export type PermissionOverrideInput = {
  permissionKey: string;
  effect: 'ALLOW' | 'DENY';
  note?: string;
};

export interface AuthorizationRepositoryPort {
  getUserRole(userId: string): Promise<string | null>;
  listUserOverrides(userId: string): Promise<{
    allow: UserPermissionOverride[];
    deny: UserPermissionOverride[];
  }>;
  setUserPermissionOverride(
    userId: string,
    override: PermissionOverrideInput,
  ): Promise<void>;
  removeUserPermissionOverride(
    userId: string,
    permissionKey: string,
  ): Promise<void>;
  replaceUserPermissions(
    userId: string,
    overrides: PermissionOverrideInput[],
  ): Promise<void>;
}
