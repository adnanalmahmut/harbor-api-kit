import type { Role } from '../entities/role.entity.js';

export interface RoleRepositoryPort {
  findAll(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findBySlug(slug: string): Promise<Role | null>;
  listUserRoleIds(userId: string): Promise<string[]>;
  listRolesForUser(userId: string): Promise<Role[]>;
  assignRoleToUser(userId: string, roleId: string): Promise<void>;
  create(role: Role): Promise<Role>;
  update(id: string, diff: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  replaceUserRoles(userId: string, roleIds: string[]): Promise<void>;
}
