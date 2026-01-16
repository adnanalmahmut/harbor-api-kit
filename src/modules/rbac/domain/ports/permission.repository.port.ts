import type { PermissionEntity } from '#src/modules/rbac/domain/entities/permission.entity.js';

export interface PermissionRepositoryPort {
  listAll(): Promise<PermissionEntity[]>;
  findById(id: string): Promise<PermissionEntity | null>;
  findByKey(action: string, subject: string): Promise<PermissionEntity | null>;
  findManyByIds(ids: string[]): Promise<PermissionEntity[]>;
}
