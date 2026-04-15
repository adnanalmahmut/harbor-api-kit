import type { AuthProviderPort } from '#src/modules/auth/index.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/index.js';
import { z } from 'zod';

export const SetUserPermissionOverrideSchema = z.object({
  permissionId: z.string().uuid(),
  effect: z.enum(['ALLOW', 'DENY']),
});

export type SetUserPermissionOverrideCommand = {
  userId: string;
} & z.infer<typeof SetUserPermissionOverrideSchema>;

import { EffectivePermissionsService } from '#src/modules/rbac/index.js';

export class SetUserPermissionOverrideUseCase {
  constructor(
    private readonly grantsRepo: GrantsRepositoryPort,
    private readonly authProvider: AuthProviderPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(command: SetUserPermissionOverrideCommand): Promise<void> {
    await this.grantsRepo.setUserPermissionOverride(
      command.userId,
      command.permissionId,
      command.effect,
    );

    // Invalidate user sessions key (AuthGuard L2)
    await this.authProvider.invalidateUserSessions(command.userId);
    // Refresh effective permissions cache (RbacGuard fallback)
    await this.effectivePermissions.refreshForUser(command.userId);
  }
}
