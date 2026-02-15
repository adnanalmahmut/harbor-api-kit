import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';

export class ListPermissionsUseCase {
  constructor(private readonly permissionRepo: PermissionRepositoryPort) {}

  async execute() {
    return this.permissionRepo.listAll();
  }
}
