import { CacheTTL } from '#src/core/domain/constants/cache.constants.js';
export { CacheTTL };

import { AuthCacheKeys } from '#src/modules/auth/application/cache/auth-cache.keys.js';
import { rbacCacheKeys } from '#src/modules/rbac/application/rbac.cache-keys.js';

export const redisKeys = {
  ...AuthCacheKeys,

  ...rbacCacheKeys,

  rateLimit: (key: string) => `rl:${key}`,

  lock: (resource: string) => `lock:${resource}`,
} as const;
