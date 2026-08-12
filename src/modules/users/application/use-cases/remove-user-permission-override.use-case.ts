import {
  EffectivePermissionsService,
  type AuthorizationRepositoryPort,
} from '#src/modules/authorization/index.js';

export type RemoveUserPermissionOverrideCommand = {
  userId: string;
  permissionKey: string;
};

export class RemoveUserPermissionOverrideUseCase {
  constructor(
    private readonly authorizationRepo: AuthorizationRepositoryPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(command: RemoveUserPermissionOverrideCommand): Promise<void> {
    await this.authorizationRepo.removeUserPermissionOverride(
      command.userId,
      command.permissionKey,
    );
    await this.effectivePermissions.refreshForUser(command.userId);
  }
}
