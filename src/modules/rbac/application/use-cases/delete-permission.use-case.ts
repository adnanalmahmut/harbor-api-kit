import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';

export class DeletePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepositoryPort) {}

  async execute(permissionId: string) {
    return this.permissionRepo.delete(permissionId);
  }
}
