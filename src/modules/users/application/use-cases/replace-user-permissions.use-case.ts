import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';

export class ReplaceUserPermissionsUseCase {
  constructor(
    private readonly grantsRepo: GrantsRepositoryPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(
    userId: string,
    overrides: {
      permissionId: string;
      effect: 'ALLOW' | 'DENY';
      note?: string;
    }[],
  ): Promise<void> {
    await this.grantsRepo.replaceUserPermissions(userId, overrides);
    await this.effectivePermissions.refreshForUser(userId);
  }
}
