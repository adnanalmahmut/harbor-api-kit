import type { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';

export class GetRolePermissionsUseCase {
  constructor(private readonly grantsRepo: GrantsRepositoryPort) {}

  async execute(roleId: string): Promise<Permission[]> {
    return this.grantsRepo.listPermissionsForRoleIds([roleId]);
  }
}
