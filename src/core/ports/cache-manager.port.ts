export interface CacheManagerPort {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string | number | Buffer,
    seconds?: number | string,
  ): Promise<'OK' | null>;
  del(key: string): Promise<number>;
}
