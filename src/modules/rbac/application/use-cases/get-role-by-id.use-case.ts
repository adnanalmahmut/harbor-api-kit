import { RbacException } from '../exceptions/rbac.exception.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';

export class GetRoleByIdUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(roleId: string) {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw RbacException.roleNotFound(roleId);
    }
    return role;
  }
}
