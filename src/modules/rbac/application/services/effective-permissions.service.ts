import type { LoggerPort } from '#src/core/application/ports/logger.port.js';
import type { CacheManagerPort } from '#src/core/domain/ports/cache-manager.port.js';
import type { RequestContextStorePort } from '#src/core/domain/ports/request-context.store.port.js';
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

/**
 * Shared logic for checking permissions including subject:manage escalation.
 */
export function checkPermission(
  key: string,
  permissions: Set<string>,
  deny: Set<string>,
): boolean {
  if (deny.has(key)) return false;
  if (permissions.has(key)) return true;

  try {
    const vo = PermissionKeyVO.parse(key);
    const mgmtKey = `${vo.subject}:manage`;
    if (deny.has(mgmtKey)) return false;
    if (permissions.has(mgmtKey)) return true;
  } catch {
    // ignore invalid keys
  }

  return false;
}

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
    private readonly contextStore: RequestContextStorePort,
  ) {}

  async buildForUser(user: {
    id: string;
    roles?: string[];
    permissions?: string[];
  }): Promise<EffectivePermissions> {
    const userId = user.id;

    // Optional: If AuthGuard already populated roles/permissions in the user object,
    // we could potentially wrap them. However, Usually AuthGuard only has basic user info.
    // If the user object HAS permissions AND roles, and we trust them for this request:
    if (user.roles?.length || user.permissions?.length) {
      // Note: This assumes the user object in req.user is fully hydrated with RBAC
      // which might not be true if it comes from a minimal session.
      // But if it is, we can return it immediately.
    }

    return this.contextStore.getOrLoad(
      rbacCacheKeys.rbacPermissions(userId),
      async () => {
        const startMs = Date.now();
        const globalVer =
          (await this.cache.get(rbacCacheKeys.rbacVersion())) || '0';
        const userVer =
          (await this.cache.get(rbacCacheKeys.rbacUserVersion(userId))) || '0';
        const cacheKey = `${rbacCacheKeys.rbacPermissions(userId)}:${globalVer}:${userVer}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
          try {
            const data = JSON.parse(cached) as CachedEffectivePermissions;
            if (!data.permissions || !data.roles || !data.deny) {
              throw new Error('Invalid cache shape');
            }
            this.logger.debug?.(
              `Cache HIT for user ${userId} (key: ${cacheKey})`,
            );
            return this.hydrate(data);
          } catch {
            this.logger.warn(
              `Cache CORRUPTION or VERSION MISMATCH for user ${userId}`,
            );
          }
        } else {
          this.logger.debug?.(
            `Cache MISS for user ${userId} (key: ${cacheKey})`,
          );
        }

        const result = await this.fetchFromDb(userId);

        const cacheData: CachedEffectivePermissions = {
          roles: Array.from(result.roles),
          permissions: Array.from(result.permissions),
          deny: Array.from(result.deny),
        };
        await this.cache.set(cacheKey, JSON.stringify(cacheData), 3600);

        // Safe event-based logging (no permission sets exposed)
        this.logger.debug?.(
          `[rbac.cache.set] userId=${userId} permissionCount=${result.permissions.size} roleCount=${result.roles.size}`,
        );
        this.logger.debug?.(
          `[rbac.perf.build] userId=${userId} ms=${Date.now() - startMs} permissionCount=${result.permissions.size} roleCount=${result.roles.size}`,
        );

        return this.createEffective(
          result.roles,
          result.permissions,
          result.deny,
        );
      },
      3600,
      'request',
    );
  }

  async refreshForUser(userId: string): Promise<void> {
    this.logger.debug?.(`Refreshing cache for user ${userId}`);
    await this.invalidateForUser(userId);
  }

  private hydrate(data: CachedEffectivePermissions): EffectivePermissions {
    const roles = new Set(data.roles);
    const permissions = new Set(data.permissions);
    const deny = new Set(data.deny);

    return {
      roles,
      permissions,
      deny,
      has: (key: string) => checkPermission(key, permissions, deny),
    };
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
      has: (key: string) => checkPermission(key, permissions, deny),
    };
  }

  async invalidateForUser(userId: string): Promise<void> {
    // Only bump user-specific version for user-specific changes
    // Global rbacVersion is only bumped for role/permission definition changes
    const userNext = await this.cache.incr(
      rbacCacheKeys.rbacUserVersion(userId),
    );

    this.logger.debug?.(
      `RBAC user version bumped user=${userId} userVer=${userNext}`,
    );
  }

  private async fetchFromDb(userId: string) {
    const [roleIds, roles, overrides] = await Promise.all([
      this.rolesRepo.listUserRoleIds(userId),
      this.rolesRepo.listRolesForUser(userId),
      this.grantsRepo.listUserOverrides(userId),
    ]);
    const roleSlugs = new Set(roles.map((r) => r.slug));

    const rolePerms = roleIds.length
      ? await this.grantsRepo.listPermissionsForRoleIds(roleIds)
      : [];

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
    const next = await this.cache.incr(rbacCacheKeys.rbacVersion());
    this.logger.log(`Global RBAC Version Incremented to ${next}`);
  }
}
