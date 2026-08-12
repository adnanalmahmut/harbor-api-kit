import { authConfig } from '#src/config/index.js';
import { CacheTTL, RedisService } from '#src/core/index.js';
import type { AuthConfigPort, SessionTrackerPort } from '../domain/index.js';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { AuthCacheKeys } from '../application/index.js';

@Injectable()
export class AuthConfigAdapter implements AuthConfigPort {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

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
