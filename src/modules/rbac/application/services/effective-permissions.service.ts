import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { Inject, Injectable } from '@nestjs/common';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';

export type EffectivePermissions = {
  allow: Set<string>;
  deny: Set<string>;
  has: (key: string) => boolean;
};

@Injectable()
export class EffectivePermissionsService {
  constructor(
    @Inject(RBAC_TOKENS.ROLE_REPOSITORY)
    private readonly rolesRepo: RoleRepositoryPort,
    @Inject(RBAC_TOKENS.GRANTS_REPOSITORY)
    private readonly grantsRepo: GrantsRepositoryPort,
  ) {}

  async buildForUser(userId: string): Promise<EffectivePermissions> {
    const roleIds = await this.rolesRepo.listUserRoleIds(userId);
    const rolePerms = roleIds.length
      ? await this.grantsRepo.listPermissionsForRoleIds(roleIds)
      : [];
    const overrides = await this.grantsRepo.listUserOverrides(userId);

    const allow = new Set<string>();
    const deny = new Set<string>();

    for (const p of rolePerms) allow.add(p.key.toString());

    for (const p of overrides.allow) allow.add(p.key.toString());
    for (const p of overrides.deny) deny.add(p.key.toString());

    return {
      allow,
      deny,
      has: (key: string) => !deny.has(key) && allow.has(key),
    };
  }
}
