import type { Permission } from '../../domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';

export class GetRolePermissionsUseCase {
  constructor(private readonly grantsRepo: GrantsRepositoryPort) {}

  async execute(roleId: string): Promise<Permission[]> {
    return this.grantsRepo.listPermissionsForRoleIds([roleId]);
  }
}
