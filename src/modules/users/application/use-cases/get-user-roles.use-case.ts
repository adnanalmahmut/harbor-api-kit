import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';

export class GetUserRolesUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(userId: string) {
    return this.roleRepo.listRolesForUser(userId);
  }
}
