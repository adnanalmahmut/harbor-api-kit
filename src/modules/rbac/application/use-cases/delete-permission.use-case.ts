import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';

export class DeletePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepositoryPort) {}

  async execute(permissionId: string) {
    return this.permissionRepo.delete(permissionId);
  }
}
