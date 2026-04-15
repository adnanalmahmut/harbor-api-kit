import { RbacException } from '../exceptions/rbac.exception.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';

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
