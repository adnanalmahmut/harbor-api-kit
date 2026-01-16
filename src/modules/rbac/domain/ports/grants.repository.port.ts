import type { PermissionEntity } from '#src/modules/rbac/domain/entities/permission.entity.js';

export interface GrantsRepositoryPort {
  listPermissionsForRoleIds(roleIds: string[]): Promise<PermissionEntity[]>;
  listUserOverrides(
    userId: string,
  ): Promise<{ allow: PermissionEntity[]; deny: PermissionEntity[] }>;
}
