import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';

export class DeleteRoleUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(roleId: string) {
    return this.roleRepo.delete(roleId);
  }
}
