import { RbacException } from '../exceptions/rbac.exception.js';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';

export class ReplaceRolePermissionsUseCase {
  constructor(
    private readonly roleRepo: RoleRepositoryPort,
    private readonly grantsRepo: GrantsRepositoryPort,
  ) {}

  async execute(roleId: string, permissionIds: string[]) {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw RbacException.roleNotFound(roleId);
    }
    await this.grantsRepo.replaceRolePermissions(roleId, permissionIds);
  }
}
