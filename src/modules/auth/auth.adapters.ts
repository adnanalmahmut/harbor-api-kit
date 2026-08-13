import { authConfig } from '#src/config/index.js';
import { CacheTTL } from '#src/infrastructure/cache/cache.constants.js';
import { RedisService } from '#src/infrastructure/cache/redis.service.js';
import { AuthConfigPort, SessionTrackerPort } from './auth.ports.js';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { AuthCacheKeys } from './auth.cache.js';

@Injectable()
export class AuthConfigAdapter extends AuthConfigPort {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {
    super();
  }

  get sessionTokenCookie(): string {
    return this.config.sessionTokenCookie;
  }

  get sessionLookupCacheTtlSec(): number {
    return Math.min(
      CacheTTL.FIFTEEN_MINUTES,
      this.config.session.rollingUpdateAgeSec,
    );
  }
}

@Injectable()
export class RedisSessionTrackerAdapter extends SessionTrackerPort {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
  ) {
    super();
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

  async invalidateUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.redisService.key(
      AuthCacheKeys.userSessions(userId),
    );
    const redis = this.redisService.raw();
    const sessionKeys = await redis.smembers(userSessionsKey);
    if (sessionKeys.length > 0) await redis.del(...sessionKeys);
    await redis.del(userSessionsKey);
  }
}
