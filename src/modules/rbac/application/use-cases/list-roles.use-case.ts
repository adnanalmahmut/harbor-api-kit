import { Role } from '#src/modules/rbac/domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { Inject } from '@nestjs/common';

export class ListRolesUseCase {
  constructor(
    @Inject(RBAC_TOKENS.ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(): Promise<Role[]> {
    return this.roleRepo.findAll();
  }
}
