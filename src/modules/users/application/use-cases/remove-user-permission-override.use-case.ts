import type { AuthProviderPort } from '#src/modules/auth/application/ports/auth-provider.port.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { Inject } from '@nestjs/common';

export type RemoveUserPermissionOverrideCommand = {
  userId: string;
  permissionId: string;
};

import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';

export class RemoveUserPermissionOverrideUseCase {
  constructor(
    @Inject(RBAC_TOKENS.GRANTS_REPOSITORY)
    private readonly grantsRepo: GrantsRepositoryPort,
    @Inject(AUTH_TOKENS.AUTH_PROVIDER)
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
