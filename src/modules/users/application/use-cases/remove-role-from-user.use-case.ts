import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { z } from 'zod';

export const RemoveRoleFromUserSchema = z.object({
  roleId: z.string().uuid(),
});

export type RemoveRoleFromUserCommand = {
  userId: string;
  roleId: string;
};

export class RemoveRoleFromUserUseCase {
  constructor(
    private readonly roleRepo: RoleRepositoryPort,
    private readonly authProvider: AuthProviderPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(command: RemoveRoleFromUserCommand): Promise<void> {
    await this.roleRepo.removeRoleFromUser(command.userId, command.roleId);

    // Invalidate user sessions key (AuthGuard L2)
    await this.authProvider.invalidateUserSessions(command.userId);
    // Refresh effective permissions cache (RbacGuard fallback)
    await this.effectivePermissions.refreshForUser(command.userId);
  }
}
