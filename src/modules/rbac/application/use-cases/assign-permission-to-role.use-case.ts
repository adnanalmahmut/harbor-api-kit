import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import { z } from 'zod';

export const AssignPermissionToRoleSchema = z.object({
  roleId: z.uuid(),
  permissionId: z.uuid(),
});

export type AssignPermissionToRoleCommand = z.infer<
  typeof AssignPermissionToRoleSchema
>;

export class AssignPermissionToRoleUseCase {
  constructor(private readonly grantsRepo: GrantsRepositoryPort) {}

  async execute(command: AssignPermissionToRoleCommand): Promise<void> {
    await this.grantsRepo.assignPermissionToRole(
      command.roleId,
      command.permissionId,
    );
  }
}
