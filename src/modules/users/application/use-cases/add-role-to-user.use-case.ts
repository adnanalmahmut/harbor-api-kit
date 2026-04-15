import type { AuthProviderPort } from '#src/modules/auth/index.js';
import { EffectivePermissionsService } from '#src/modules/rbac/index.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/index.js';
import { z } from 'zod';

export const AddRoleToUserSchema = z.object({
  roleId: z.string().uuid(),
});

export type AddRoleToUserCommand = {
  userId: string;
} & z.infer<typeof AddRoleToUserSchema>;

export class AddRoleToUserUseCase {
  constructor(
    private readonly roleRepo: RoleRepositoryPort,
    private readonly authProvider: AuthProviderPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(command: AddRoleToUserCommand): Promise<void> {
    await this.roleRepo.assignRoleToUser(command.userId, command.roleId);

    // Invalidate user sessions key (AuthGuard L2)
    await this.authProvider.invalidateUserSessions(command.userId);
    // Refresh effective permissions cache (RbacGuard fallback)
    await this.effectivePermissions.refreshForUser(command.userId);
  }
}
