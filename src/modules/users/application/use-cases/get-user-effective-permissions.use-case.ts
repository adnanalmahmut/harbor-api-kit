import { EffectivePermissionsService } from '#src/modules/authorization/index.js';

export class GetUserEffectivePermissionsUseCase {
  constructor(
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(userId: string) {
    const effective = await this.effectivePermissions.buildForUser({
      id: userId,
    });
    return {
      roles: Array.from(effective.roles),
      permissions: Array.from(effective.permissions),
    };
  }
}
