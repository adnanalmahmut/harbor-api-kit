import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  AuthorizationRepository,
  type PermissionOverrideInput,
} from './authorization.repository.js';
import { EffectivePermissionsService } from './effective-permissions.service.js';
import { isPermissionKey } from './permissions.catalog.js';

export const SetUserPermissionOverrideSchema = z.object({
  permissionKey: z.string().refine(isPermissionKey),
  effect: z.enum(['ALLOW', 'DENY']),
  note: z.string().max(500).optional(),
});

export type SetUserPermissionOverrideCommand = {
  userId: string;
} & z.infer<typeof SetUserPermissionOverrideSchema>;

export type RemoveUserPermissionOverrideCommand = {
  userId: string;
  permissionKey: string;
};

/**
 * Per-user ALLOW/DENY overrides — the gap Better Auth's role-only
 * `hasPermission` leaves open. Every write invalidates the cached effective
 * permissions for that user.
 */
@Injectable()
export class AuthorizationService {
  constructor(
    private readonly repository: AuthorizationRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async listOverrides(userId: string) {
    return this.repository.listUserOverrides(userId);
  }

  async setOverride(command: SetUserPermissionOverrideCommand): Promise<void> {
    await this.repository.setUserPermissionOverride(command.userId, {
      permissionKey: command.permissionKey,
      effect: command.effect,
      note: command.note,
    });
    await this.effectivePermissions.refreshForUser(command.userId);
  }

  async removeOverride(
    command: RemoveUserPermissionOverrideCommand,
  ): Promise<void> {
    await this.repository.removeUserPermissionOverride(
      command.userId,
      command.permissionKey,
    );
    await this.effectivePermissions.refreshForUser(command.userId);
  }

  async replaceOverrides(
    userId: string,
    overrides: PermissionOverrideInput[],
  ): Promise<void> {
    await this.repository.replaceUserPermissions(userId, overrides);
    await this.effectivePermissions.refreshForUser(userId);
  }

  async getEffectivePermissions(userId: string) {
    const effective = await this.effectivePermissions.buildForUser({
      id: userId,
    });

    return {
      roles: Array.from(effective.roles),
      permissions: Array.from(effective.permissions),
    };
  }
}
