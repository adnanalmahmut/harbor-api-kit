import { isPermissionKey } from '../../domain/permissions.catalog.js';
import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';
import { EffectivePermissionsService } from '../services/effective-permissions.service.js';
import { z } from 'zod';

export const SetUserPermissionOverrideSchema = z.object({
  permissionKey: z.string().refine(isPermissionKey),
  effect: z.enum(['ALLOW', 'DENY']),
  note: z.string().max(500).optional(),
});

export type SetUserPermissionOverrideCommand = {
  userId: string;
} & z.infer<typeof SetUserPermissionOverrideSchema>;

export class SetUserPermissionOverrideUseCase {
  constructor(
    private readonly authorizationRepo: AuthorizationRepositoryPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(command: SetUserPermissionOverrideCommand): Promise<void> {
    await this.authorizationRepo.setUserPermissionOverride(command.userId, {
      permissionKey: command.permissionKey,
      effect: command.effect,
      note: command.note,
    });
    await this.effectivePermissions.refreshForUser(command.userId);
  }
}
