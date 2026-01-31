import { RbacException } from '#src/modules/rbac/domain/exceptions/rbac.exception.js';
import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';

export class GetPermissionByIdUseCase {
  constructor(private readonly permissionRepo: PermissionRepositoryPort) {}

  async execute(permissionId: string) {
    const permission = await this.permissionRepo.findById(permissionId);
    if (!permission) {
      throw RbacException.permissionNotFound(permissionId);
    }
    return permission;
  }
}
