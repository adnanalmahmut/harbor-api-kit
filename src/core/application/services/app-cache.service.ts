import type { RequestContext } from '#src/core/domain/context/request-context.type.js';

export type CacheScope = 'request' | 'redis' | 'both';

export class AppCacheService {
  async getOrLoad<T>(
    context: RequestContext,
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number,
    scope: CacheScope = 'request',
  ): Promise<T> {
    if (!context) return loader();

    // 1. Check Request Cache (Memoization)
    if (scope === 'request' || scope === 'both') {
      if (!context.cache) context.cache = new Map<string, unknown>();

      const cached = context.cache.get(key);
      if (cached !== undefined) return cached as T;
    }

    // 2. Check Redis
    if ((scope === 'redis' || scope === 'both') && context.redis) {
      const redis = context.redis;
      const cachedString = await redis.get(key);
      if (cachedString !== null) {
        try {
          const cached = JSON.parse(cachedString) as T;
          // Populate request cache too if 'both'
          if (scope === 'both' && context.cache) context.cache.set(key, cached);
          return cached;
        } catch {
          // Ignore parse errors, reload
        }
      }
    }

    // 3. Load
    const value = await loader();

    // 4. Set Caches
    if (scope === 'request' || scope === 'both') {
      if (context.cache) context.cache.set(key, value);
    }

    if (
      (scope === 'redis' || scope === 'both') &&
      context.redis &&
      ttlSeconds &&
      ttlSeconds > 0
    ) {
      await context.redis.set(key, JSON.stringify(value), ttlSeconds);
    }

    return value;
  }
}
