import type {
  CacheManagerPort,
  LoggerPort,
  RequestContextStorePort,
} from '#src/core/index.js';
import { authorizationCacheKeys } from '../authorization.cache-keys.js';
import {
  parseStoredRoles,
  permissionsForRoles,
  type RoleName,
} from '../../domain/permissions.catalog.js';
import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';
import { PermissionCalculator } from '../../domain/services/permission-calculator.js';
import { PermissionKeyVO } from '../../domain/value-objects/permission-key.vo.js';

export type EffectivePermissions = {
  roles: Set<RoleName>;
  permissions: Set<string>;
  deny: Set<string>;
  has: (key: string) => boolean;
};

export function checkPermission(
  key: string,
  permissions: Set<string>,
  deny: Set<string>,
): boolean {
  if (deny.has(key)) return false;
  if (permissions.has(key)) return true;

  try {
    const permission = PermissionKeyVO.parse(key);
    const manageKey = `${permission.subject}:manage`;
    if (deny.has(manageKey)) return false;
    return permissions.has(manageKey);
  } catch {
    return false;
  }
}

type CachedEffectivePermissions = {
  roles: RoleName[];
  permissions: string[];
  deny: string[];
};

export class EffectivePermissionsService {
  constructor(
    private readonly authorizationRepo: AuthorizationRepositoryPort,
    private readonly cache: CacheManagerPort,
    private readonly logger: LoggerPort,
    private readonly contextStore: RequestContextStorePort,
  ) {}

  async buildForUser(user: { id: string }): Promise<EffectivePermissions> {
    const userId = user.id;
    return this.contextStore.getOrLoad(
      authorizationCacheKeys.userPermissions(userId),
      async () => {
        const version =
          (await this.cache.get(authorizationCacheKeys.userVersion(userId))) ||
          '0';
        const cacheKey = authorizationCacheKeys.effectivePermissions(
          userId,
          version,
        );
        const cached = await this.cache.get(cacheKey);
        const parsed = cached ? this.parseCached(cached) : null;
        if (parsed) return this.hydrate(parsed);

        const result = await this.fetchAuthorization(userId);
        await this.cache.set(
          cacheKey,
          JSON.stringify({
            roles: Array.from(result.roles),
            permissions: Array.from(result.permissions),
            deny: Array.from(result.deny),
          } satisfies CachedEffectivePermissions),
          3600,
        );
        return result;
      },
      3600,
      'request',
    );
  }

  async refreshForUser(userId: string): Promise<void> {
    await this.cache.incr(authorizationCacheKeys.userVersion(userId));
  }

  private async fetchAuthorization(
    userId: string,
  ): Promise<EffectivePermissions> {
    const [storedRole, overrides] = await Promise.all([
      this.authorizationRepo.getUserRole(userId),
      this.authorizationRepo.listUserOverrides(userId),
    ]);
    const { roles, unknown } = parseStoredRoles(storedRole);
    if (unknown.length > 0) {
      this.logger.warn(
        `[authorization.role.unknown] userId=${userId} count=${unknown.length}`,
      );
    }

    const allow = overrides.allow.map((item) => item.key.toString());
    const deny = overrides.deny.map((item) => item.key.toString());
    const effective = PermissionCalculator.calculate(
      permissionsForRoles(roles),
      allow,
      deny,
    );

    return this.createEffective(
      new Set(roles),
      new Set(effective),
      new Set(deny),
    );
  }

  private parseCached(raw: string): CachedEffectivePermissions | null {
    try {
      const value = JSON.parse(raw) as Partial<CachedEffectivePermissions>;
      if (
        !Array.isArray(value.roles) ||
        !Array.isArray(value.permissions) ||
        !Array.isArray(value.deny)
      ) {
        return null;
      }
      return value as CachedEffectivePermissions;
    } catch {
      return null;
    }
  }

  private hydrate(data: CachedEffectivePermissions): EffectivePermissions {
    return this.createEffective(
      new Set(data.roles),
      new Set(data.permissions),
      new Set(data.deny),
    );
  }

  private createEffective(
    roles: Set<RoleName>,
    permissions: Set<string>,
    deny: Set<string>,
  ): EffectivePermissions {
    return {
      roles,
      permissions,
      deny,
      has: (key) => checkPermission(key, permissions, deny),
    };
  }
}
