import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { AuthCacheKeys } from '#src/modules/auth/application/cache/auth-cache.keys.js';
import { SessionTrackerPort } from '#src/modules/auth/application/ports/session-tracker.port.js';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RedisSessionTrackerAdapter implements SessionTrackerPort {
  private readonly logger = new Logger(RedisSessionTrackerAdapter.name);

  constructor(private readonly redisService: RedisService) {}

  async trackSession(userId: string, rawCacheKey: string): Promise<void> {
    const userSessionsKey = this.redisService.key(
      AuthCacheKeys.userSessions(userId),
    );
    const prefixedCacheKey = this.redisService.key(rawCacheKey);

    this.logger.debug(
      `Tracking session key: ${prefixedCacheKey} in set: ${userSessionsKey}`,
    );

    try {
      await this.redisService.raw().sadd(userSessionsKey, prefixedCacheKey);
      await this.redisService.raw().expire(userSessionsKey, 60 * 60 * 24 * 7);
    } catch (err) {
      this.logger.error('Failed to track session key', err);
    }
  }
}
