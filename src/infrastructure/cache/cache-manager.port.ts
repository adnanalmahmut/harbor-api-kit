/**
 * The slice of a key-value cache the application uses. Abstract class rather
 * than an interface so it doubles as the DI token; bound to `RedisService` in
 * `RedisModule`.
 */
export abstract class CacheManagerPort {
  abstract get(key: string): Promise<string | null>;
  abstract set(
    key: string,
    value: string | number | Buffer,
    seconds?: number | string,
  ): Promise<'OK' | null>;
  abstract del(key: string): Promise<number>;
  abstract incr(key: string): Promise<number>;
}
