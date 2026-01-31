import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';

export class GetUserEffectivePermissionsUseCase {
  constructor(
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(userId: string) {
    const effective = await this.effectivePermissions.buildForUser(userId);
    return {
      roles: Array.from(effective.roles),
      permissions: Array.from(effective.permissions),
    };
  }
}
