import type { CacheManagerPort } from '#src/core/ports/cache-manager.port.js';
import type { LoggerPort } from '#src/core/ports/logger.port.js';
import { rbacCacheKeys } from '#src/modules/rbac/application/rbac.cache-keys.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { PermissionCalculator } from '#src/modules/rbac/domain/services/permission-calculator.js';
import { PermissionKeyVO } from '#src/modules/rbac/domain/value-objects/permission-key.vo.js';

export type EffectivePermissions = {
  roles: Set<string>;
  permissions: Set<string>;
  deny: Set<string>;
  has: (key: string) => boolean;
};

type CachedEffectivePermissions = {
  roles: string[];
  permissions: string[];
  deny: string[];
};

export class EffectivePermissionsService {
  constructor(
    private readonly rolesRepo: RoleRepositoryPort,
    private readonly grantsRepo: GrantsRepositoryPort,
    private readonly cache: CacheManagerPort,
    private readonly logger: LoggerPort,
  ) {}

  async buildForUser(userId: string): Promise<EffectivePermissions> {
    const version = (await this.cache.get(rbacCacheKeys.rbacVersion())) || '0';
    const cacheKey = `${rbacCacheKeys.rbacPermissions(userId)}:${version}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      try {
        const data = JSON.parse(cached) as CachedEffectivePermissions;
        if (!data.permissions || !data.roles || !data.deny) {
          throw new Error('Invalid cache shape');
        }
        this.logger.debug?.(`Cache HIT for user ${userId} (key: ${cacheKey})`);
        return this.hydrate(data);
      } catch {
        this.logger.warn(
          `Cache CORRUPTION or VERSION MISMATCH for user ${userId}`,
        );
      }
    } else {
      this.logger.debug?.(`Cache MISS for user ${userId} (key: ${cacheKey})`);
    }

    const result = await this.fetchFromDb(userId);

    const cacheData: CachedEffectivePermissions = {
      roles: Array.from(result.roles),
      permissions: Array.from(result.permissions),
      deny: Array.from(result.deny),
    };
    await this.cache.set(cacheKey, JSON.stringify(cacheData), 3600);
    this.logger.debug?.(`Cache SET for user ${userId}`);

    // Debug logging for troubleshooting tests
    if (result.permissions.size === 0) {
      this.logger.warn(`User ${userId} has NO permissions`);
    } else {
      this.logger.log(
        `User ${userId} permissions: ${Array.from(result.permissions).join(', ')}`,
      );
    }

    return this.createEffective(result.roles, result.permissions, result.deny);
  }

  async refreshForUser(userId: string): Promise<void> {
    this.logger.debug?.(`Refreshing cache for user ${userId}`);
    const version = (await this.cache.get(rbacCacheKeys.rbacVersion())) || '0';
    const cacheKey = `${rbacCacheKeys.rbacPermissions(userId)}:${version}`;

    const result = await this.fetchFromDb(userId);

    const cacheData: CachedEffectivePermissions = {
      roles: Array.from(result.roles),
      permissions: Array.from(result.permissions),
      deny: Array.from(result.deny),
    };

    await this.cache.set(cacheKey, JSON.stringify(cacheData), 3600);
    this.logger.debug?.(
      `Cache REFRESHED for user ${userId} (key: ${cacheKey})`,
    );
  }

  private hydrate(data: CachedEffectivePermissions): EffectivePermissions {
    return this.createEffective(
      new Set(data.roles),
      new Set(data.permissions),
      new Set(data.deny),
    );
  }

  private createEffective(
    roles: Set<string>,
    permissions: Set<string>,
    deny: Set<string>,
  ): EffectivePermissions {
    return {
      roles,
      permissions,
      deny,
      has: (key: string) => {
        if (deny.has(key)) return false;
        if (permissions.has(key)) return true;

        try {
          const vo = PermissionKeyVO.parse(key);
          const mgmtKey = `${vo.subject}:manage`;
          if (deny.has(mgmtKey)) return false;
          // Check escalation against the flattened list
          if (permissions.has(mgmtKey)) return true;
        } catch {
          // ignore invalid keys
        }

        return false;
      },
    };
  }

  async invalidateForUser(userId: string): Promise<void> {
    const version = (await this.cache.get(rbacCacheKeys.rbacVersion())) || '0';
    const cacheKey = `${rbacCacheKeys.rbacPermissions(userId)}:${version}`;
    await this.cache.del(cacheKey);
    this.logger.debug?.(
      `Cache INVALIDATED for user ${userId} (key: ${cacheKey})`,
    );
  }

  private async fetchFromDb(userId: string) {
    const roleIds = await this.rolesRepo.listUserRoleIds(userId);

    const roles = await this.rolesRepo.listRolesForUser(userId);
    const roleSlugs = new Set(roles.map((r) => r.slug));

    const rolePerms = roleIds.length
      ? await this.grantsRepo.listPermissionsForRoleIds(roleIds)
      : [];

    const overrides = await this.grantsRepo.listUserOverrides(userId);

    const rolePermissionsList = rolePerms.map((p) => p.key.toString());
    const allowOverridesList = overrides.allow.map((p) => p.key.toString());
    const denyOverridesList = overrides.deny.map((p) => p.key.toString());

    // Use PermissionCalculator to get the clean list of allowed permissions
    // This handles (Roles U Allow) \ Deny logic
    const effectiveList = PermissionCalculator.calculate(
      rolePermissionsList,
      allowOverridesList,
      denyOverridesList,
    );

    // We also keep the 'deny' set for the specific 'has()' check that safeguards semantics
    const denySet = new Set(denyOverridesList);

    return {
      roles: roleSlugs,
      permissions: new Set(effectiveList),
      deny: denySet,
    };
  }

  async invalidateAll(): Promise<void> {
    const key = rbacCacheKeys.rbacVersion();
    const v = (await this.cache.get(key)) || '0';
    const next = (parseInt(v) + 1).toString();
    await this.cache.set(key, next);
    this.logger.log(`Global RBAC Version Incremented to ${next}`);
  }
}
