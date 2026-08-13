import { getRequestContext } from '#src/common/request-context.js';

/**
 * The slice of a key-value cache the application uses. Abstract class rather
 * than an interface so it doubles as the DI token; bound to `RedisService` in
 * `CacheModule`.
 */
export abstract class CachePort {
  abstract get(key: string): Promise<string | null>;
  abstract set(
    key: string,
    value: string | number | Buffer,
    seconds?: number | string,
  ): Promise<'OK' | null>;
  abstract del(key: string): Promise<number>;
  abstract incr(key: string): Promise<number>;
}

export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
} as const;

export type CacheScope = 'request' | 'redis' | 'both';

/**
 * Two-tier read-through cache: a per-request memo, then Redis.
 *
 * `scope` picks the tiers. `request` memoizes for the life of the request only
 * — right for values that are cheap to recompute but read many times per
 * request. `both` adds the Redis tier, which needs a `ttlSeconds` to be
 * written.
 *
 * This was a provider (`AppCacheService`) reached through the request-context
 * port, and it read Redis off a `context.redis` field that bootstrap stuffed
 * into every request — a back channel around DI. It is a function now, and the
 * caller passes the cache it already injects.
 */
export async function getOrLoad<T>(
  cache: CachePort,
  key: string,
  loader: () => Promise<T>,
  ttlSeconds?: number,
  scope: CacheScope = 'request',
): Promise<T> {
  const context = getRequestContext();

  const useRequestTier = scope === 'request' || scope === 'both';
  const useRedisTier = scope === 'redis' || scope === 'both';

  if (useRequestTier && context) {
    if (!context.cache) context.cache = new Map<string, unknown>();
    if (context.cache.has(key)) return context.cache.get(key) as T;
  }

  if (useRedisTier) {
    const cachedString = await cache.get(key);
    if (cachedString !== null) {
      try {
        const cached = JSON.parse(cachedString) as T;
        if (useRequestTier) context?.cache?.set(key, cached);
        return cached;
      } catch {
        // Unparseable entry: fall through and reload.
      }
    }
  }

  const value = await loader();

  if (useRequestTier) context?.cache?.set(key, value);

  if (useRedisTier && ttlSeconds && ttlSeconds > 0) {
    await cache.set(key, JSON.stringify(value), ttlSeconds);
  }

  return value;
}
