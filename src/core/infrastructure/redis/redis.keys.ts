import { AuthCacheKeys } from '#src/modules/auth/application/auth.cache.js';
import { rbacCacheKeys } from '#src/modules/rbac/application/rbac.cache-keys.js';

export const redisKeys = {
  ...AuthCacheKeys,
  ...rbacCacheKeys,
  rateLimit: (key: string) => `rl:${key}`,
  lock: (resource: string) => `lock:${resource}`,
} as const;
