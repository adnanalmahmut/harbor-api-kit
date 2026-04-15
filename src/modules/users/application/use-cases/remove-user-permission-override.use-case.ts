import type { AuthProviderPort } from '#src/modules/auth/index.js';
import { EffectivePermissionsService } from '#src/modules/rbac/index.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/index.js';

export type RemoveUserPermissionOverrideCommand = {
  userId: string;
  permissionId: string;
};

export class RemoveUserPermissionOverrideUseCase {
  constructor(
    private readonly grantsRepo: GrantsRepositoryPort,
    private readonly authProvider: AuthProviderPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(command: RemoveUserPermissionOverrideCommand): Promise<void> {
    await this.grantsRepo.removeUserPermissionOverride(
      command.userId,
      command.permissionId,
    );

    // Invalidate user sessions key (AuthGuard L2)
    await this.authProvider.invalidateUserSessions(command.userId);
    // Refresh effective permissions cache (RbacGuard fallback)
    await this.effectivePermissions.refreshForUser(command.userId);
  }
}
