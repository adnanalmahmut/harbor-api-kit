import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import { z } from 'zod';

export const RemovePermissionFromRoleSchema = z.object({
  roleId: z.string().uuid(),
  permissionId: z.string().uuid(),
});

export type RemovePermissionFromRoleCommand = z.infer<
  typeof RemovePermissionFromRoleSchema
>;

export class RemovePermissionFromRoleUseCase {
  constructor(private readonly grantsRepo: GrantsRepositoryPort) {}

  async execute(command: RemovePermissionFromRoleCommand): Promise<void> {
    await this.grantsRepo.removePermissionFromRole(
      command.roleId,
      command.permissionId,
    );
  }
}
