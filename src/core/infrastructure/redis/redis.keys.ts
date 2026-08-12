// These are the ONLY justified deep-imports from core into modules.
// Importing via barrels would create a circular dependency because the
// module barrels re-export the NestJS module class, which depends on core.
// Cache key constants are side-effect-free value objects — safe to import directly.
import { AuthCacheKeys } from '#src/modules/auth/application/auth.cache.js';
import { authorizationCacheKeys } from '#src/modules/authorization/application/authorization.cache-keys.js';

export const redisKeys = {
  ...AuthCacheKeys,
  ...authorizationCacheKeys,
  rateLimit: (key: string) => `rl:${key}`,
  lock: (resource: string) => `lock:${resource}`,
} as const;
