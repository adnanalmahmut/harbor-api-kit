import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
import { Injectable } from '@nestjs/common';
import type { CacheHealthPort } from '../domain/index.js';

@Injectable()
export class RedisCacheHealthAdapter implements CacheHealthPort {
  constructor(private readonly redis: RedisService) {}

  async ping(): Promise<void> {
    await this.redis.raw().ping();
  }
}
