import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
import { AuthCacheKeys } from '#src/modules/auth/application/cache/auth-cache.keys.js';
import { SessionTrackerPort } from '#src/modules/auth/domain/ports/session-tracker.port.js';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class RedisSessionTrackerAdapter implements SessionTrackerPort {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RedisSessionTrackerAdapter.name);
  }

  async trackSession(userId: string, rawCacheKey: string): Promise<void> {
    const userSessionsKey = this.redisService.key(
      AuthCacheKeys.userSessions(userId),
    );
    const prefixedCacheKey = this.redisService.key(rawCacheKey);
    const maskedKey = `${prefixedCacheKey.substring(0, 10)}...`;

    this.logger.debug(
      `Tracking session key: ${maskedKey} in set: ${userSessionsKey}`,
    );

    try {
      await this.redisService.raw().sadd(userSessionsKey, prefixedCacheKey);
      await this.redisService.raw().expire(userSessionsKey, 60 * 60 * 24 * 7);
    } catch (err) {
      this.logger.error(err, 'Failed to track session key');
    }
  }
}
