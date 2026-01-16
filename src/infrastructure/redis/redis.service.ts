import type { Redis } from 'ioredis';

export class RedisService {
  constructor(
    private readonly client: Redis,
    private readonly prefix: string,
  ) {}

  key(key: string) {
    return `${this.prefix}${key}`;
  }

  raw() {
    return this.client;
  }

  async ping() {
    return this.client.ping();
  }

  async get(key: string) {
    return this.client.get(this.key(key));
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    const k = this.key(key);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(k, value, 'EX', ttlSeconds);
      return;
    }
    await this.client.set(k, value);
  }

  async del(key: string) {
    return this.client.del(this.key(key));
  }

  async setNxEx(key: string, value: string, ttlSeconds: number) {
    const setWithNxEx = this.client.set as unknown as (
      key: string,
      value: string,
      nx: 'NX',
      ex: 'EX',
      ttl: number,
    ) => Promise<'OK' | null>;

    return setWithNxEx(this.key(key), value, 'NX', 'EX', ttlSeconds);
  }

  async ttl(key: string) {
    return this.client.ttl(this.key(key));
  }
}
