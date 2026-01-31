import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { Inject } from '@nestjs/common';
import { z } from 'zod';

export const AssignPermissionToRoleSchema = z.object({
  roleId: z.string().uuid(),
  permissionId: z.string().uuid(),
});

export type AssignPermissionToRoleCommand = z.infer<
  typeof AssignPermissionToRoleSchema
>;

export class AssignPermissionToRoleUseCase {
  constructor(
    @Inject(RBAC_TOKENS.GRANTS_REPOSITORY)
    private readonly grantsRepo: GrantsRepositoryPort,
  ) {}

  async execute(command: AssignPermissionToRoleCommand): Promise<void> {
    await this.grantsRepo.assignPermissionToRole(
      command.roleId,
      command.permissionId,
    );
  }
}
