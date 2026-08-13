import type { PermissionKeyVO } from './permission-key.vo.js';

/** One stored ALLOW/DENY row. Produced and consumed only by the port below. */
export class UserPermissionOverride {
  constructor(
    readonly key: PermissionKeyVO,
    readonly effect: 'ALLOW' | 'DENY',
    readonly note?: string,
  ) {}
}

export type PermissionOverrideInput = {
  permissionKey: string;
  effect: 'ALLOW' | 'DENY';
  note?: string;
};

/**
 * Abstract class rather than an interface so it doubles as the DI token.
 * Implemented in `src/persistence/prisma/authorization.prisma.repository.ts`
 * and bound in `PersistenceModule`.
 */
export abstract class AuthorizationRepository {
  abstract getUserRole(userId: string): Promise<string | null>;
  abstract listUserOverrides(userId: string): Promise<{
    allow: UserPermissionOverride[];
    deny: UserPermissionOverride[];
  }>;
  abstract setUserPermissionOverride(
    userId: string,
    override: PermissionOverrideInput,
  ): Promise<void>;
  abstract removeUserPermissionOverride(
    userId: string,
    permissionKey: string,
  ): Promise<void>;
  abstract replaceUserPermissions(
    userId: string,
    overrides: PermissionOverrideInput[],
  ): Promise<void>;
}
