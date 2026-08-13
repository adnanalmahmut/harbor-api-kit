import { RedisService } from '#src/infrastructure/cache/redis.service.js';
import { Injectable } from '@nestjs/common';
import { CacheHealthPort } from './health.ports.js';

@Injectable()
export class RedisCacheHealthAdapter extends CacheHealthPort {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async ping(): Promise<void> {
    await this.redis.raw().ping();
  }
}
