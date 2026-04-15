import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';

export class ListPermissionsUseCase {
  constructor(private readonly permissionRepo: PermissionRepositoryPort) {}

  async execute() {
    return this.permissionRepo.listAll();
  }
}
