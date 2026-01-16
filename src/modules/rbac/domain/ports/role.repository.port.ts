import type { RoleEntity } from '#src/modules/rbac/domain/entities/role.entity.js';

export interface RoleRepositoryPort {
  findBySlug(slug: string): Promise<RoleEntity | null>;
  listUserRoleIds(userId: string): Promise<string[]>;
  listRolesForUser(userId: string): Promise<RoleEntity[]>;
}
