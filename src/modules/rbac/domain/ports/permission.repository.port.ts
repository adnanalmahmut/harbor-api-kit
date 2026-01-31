import type { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';

export interface PermissionRepositoryPort {
  listAll(): Promise<Permission[]>;
  findById(id: string): Promise<Permission | null>;
  findByKey(action: string, subject: string): Promise<Permission | null>;
  findManyByIds(ids: string[]): Promise<Permission[]>;
  create(permission: Permission): Promise<Permission>;
  update(id: string, diff: Partial<Permission>): Promise<Permission>;
  delete(id: string): Promise<void>;
}
