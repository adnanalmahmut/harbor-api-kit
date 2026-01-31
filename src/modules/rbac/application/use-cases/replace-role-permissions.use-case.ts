import { RbacException } from '#src/modules/rbac/domain/exceptions/rbac.exception.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';

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
