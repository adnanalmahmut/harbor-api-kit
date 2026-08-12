import type {
  AuthorizationRepositoryPort,
  PermissionOverrideInput,
} from '../../domain/ports/authorization.repository.port.js';
import { EffectivePermissionsService } from '../services/effective-permissions.service.js';

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
