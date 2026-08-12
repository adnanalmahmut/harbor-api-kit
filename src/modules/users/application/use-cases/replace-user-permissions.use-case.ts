import {
  EffectivePermissionsService,
  type AuthorizationRepositoryPort,
  type PermissionOverrideInput,
} from '#src/modules/authorization/index.js';

export class ReplaceUserPermissionsUseCase {
  constructor(
    private readonly authorizationRepo: AuthorizationRepositoryPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(
    userId: string,
    overrides: PermissionOverrideInput[],
  ): Promise<void> {
    await this.authorizationRepo.replaceUserPermissions(userId, overrides);
    await this.effectivePermissions.refreshForUser(userId);
  }
}
