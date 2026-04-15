import type { AuthProviderPort } from '#src/modules/auth/index.js';
import { EffectivePermissionsService } from '#src/modules/rbac/index.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/index.js';

export class ReplaceUserRolesUseCase {
  constructor(
    private readonly roleRepo: RoleRepositoryPort,
    private readonly authProvider: AuthProviderPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(userId: string, roleIds: string[]): Promise<void> {
    await this.roleRepo.replaceUserRoles(userId, roleIds);

    // Invalidate user sessions key (AuthGuard L2)
    await this.authProvider.invalidateUserSessions(userId);
    // Refresh effective permissions cache (RbacGuard fallback)
    await this.effectivePermissions.refreshForUser(userId);
  }
}
