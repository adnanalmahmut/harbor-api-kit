import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';

export class ListRolesUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute() {
    return this.roleRepo.findAll();
  }
}
