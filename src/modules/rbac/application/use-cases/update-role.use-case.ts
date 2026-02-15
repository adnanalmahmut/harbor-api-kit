import { RbacException } from '#src/modules/rbac/application/exceptions/rbac.exception.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { z } from 'zod';

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
});

export type UpdateRoleCommand = z.infer<typeof UpdateRoleSchema>;

export class UpdateRoleUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(roleId: string, command: UpdateRoleCommand) {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw RbacException.roleNotFound(roleId);
    }
    return this.roleRepo.update(roleId, command);
  }
}
