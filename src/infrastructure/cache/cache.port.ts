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
