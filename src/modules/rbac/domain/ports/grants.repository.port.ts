import type { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { UserPermissionOverride } from '#src/modules/rbac/domain/value-objects/user-permission-override.vo.js';

export interface GrantsRepositoryPort {
  listPermissionsForRoleIds(roleIds: string[]): Promise<Permission[]>;
  listUserOverrides(userId: string): Promise<{
    allow: UserPermissionOverride[];
    deny: UserPermissionOverride[];
  }>;
  assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  setUserPermissionOverride(
    userId: string,
    permissionId: string,
    effect: 'ALLOW' | 'DENY',
  ): Promise<void>;
  removeUserPermissionOverride(
    userId: string,
    permissionId: string,
  ): Promise<void>;
  replaceRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void>;
  replaceUserPermissions(
    userId: string,
    overrides: {
      permissionId: string;
      effect: 'ALLOW' | 'DENY';
      note?: string;
    }[],
  ): Promise<void>;
}
