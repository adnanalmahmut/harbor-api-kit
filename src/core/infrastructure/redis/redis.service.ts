import type { CacheManagerPort } from '#src/core/domain/index.js';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';

@Injectable()
export class RedisService implements CacheManagerPort, OnApplicationShutdown {
  constructor(
    private readonly client: Redis,
    private prefix: string,
  ) {
    this.prefix = prefix.endsWith(':') ? prefix.slice(0, -1) : prefix;
  }

  async onApplicationShutdown() {
    if (this.client.status === 'ready') {
      await this.client.quit();
    }
  }

  key(key: string) {
    return `${this.prefix}:${key}`;
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

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    const k = this.key(key);
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(k, value, 'EX', ttlSeconds);
    }
    return this.client.set(k, value);
  }

  async del(key: string) {
    return this.client.del(this.key(key));
  }

  async setNxEx(key: string, value: string, ttlSeconds: number) {
    const setWithNxEx = this.client.set.bind(this.client) as unknown as (
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

  async incr(key: string): Promise<number> {
    return this.client.incr(this.key(key));
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({
      match: this.key(pattern),
    });

    for await (const keys of stream) {
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    }
  }
}
