export const CachePrefix = 'scp';

export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
} as const;

import { AuthCacheKeys } from '#src/modules/auth/application/cache/auth-cache.keys.js';
import { rbacCacheKeys } from '#src/modules/rbac/application/rbac.cache-keys.js';

export const redisKeys = {
  // Auth (Imported from Application)
  ...AuthCacheKeys,

  // RBAC (Imported from Application)
  ...rbacCacheKeys,

  // Rate Limit (Prefix Only, usually handled by library logic but defined here for consistency)
  rateLimit: (key: string) => `${CachePrefix}:rl:${key}`,

  // Locks
  lock: (resource: string) => `${CachePrefix}:lock:${resource}`,
} as const;
