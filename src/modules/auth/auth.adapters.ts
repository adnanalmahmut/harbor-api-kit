import { authConfig, i18nConfig } from '#src/config/index.js';
import { CacheTTL } from '#src/infrastructure/cache/cache.port.js';
import { RedisService } from '#src/infrastructure/cache/redis.service.js';
import { resolveLocaleFromSource } from '#src/infrastructure/i18n/i18n.utils.js';
import { AuthEmailPort } from '#src/modules/notify/notify.ports.js';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { authCacheKeys } from './auth.cache-keys.js';
import {
  AuthConfigPort,
  SessionTrackerPort,
  type AuthEmailDelivery,
  type AuthEmailLocaleSource,
  type AuthEmailSenderPort,
  type ChangeEmailConfirmationDelivery,
} from './auth.ports.js';

/**
 * Every port this module declares, implemented. Three small classes that share
 * one job — connecting the auth module to something outside it — rather than
 * three files, one of which held a single 70-line class.
 */

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
      authCacheKeys.userSessions(userId),
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
      authCacheKeys.userSessions(userId),
    );
    const redis = this.redisService.raw();
    const sessionKeys = await redis.smembers(userSessionsKey);
    if (sessionKeys.length > 0) await redis.del(...sessionKeys);
    await redis.del(userSessionsKey);
  }
}

/**
 * Translates Better Auth's email callbacks into notification intents. It owns
 * one decision only — which language to send in. Templates, subjects, queuing,
 * retries and failure handling belong to the notify module.
 */
@Injectable()
export class AuthEmailSenderAdapter implements AuthEmailSenderPort {
  constructor(
    @Inject(i18nConfig.KEY)
    private readonly i18nConfiguration: ConfigType<typeof i18nConfig>,
    private readonly authEmails: AuthEmailPort,
  ) {}

  async sendVerificationEmail(delivery: AuthEmailDelivery): Promise<void> {
    await this.authEmails.sendAuthEmail({
      kind: 'verify-email',
      to: delivery.user.email,
      name: delivery.user.name ?? '',
      url: delivery.url,
      locale: this.resolveLocale(delivery),
    });
  }

  async sendResetPasswordEmail(delivery: AuthEmailDelivery): Promise<void> {
    await this.authEmails.sendAuthEmail({
      kind: 'reset-password',
      to: delivery.user.email,
      name: delivery.user.name ?? '',
      url: delivery.url,
      locale: this.resolveLocale(delivery),
    });
  }

  async sendChangeEmailConfirmation(
    delivery: ChangeEmailConfirmationDelivery,
  ): Promise<void> {
    await this.authEmails.sendAuthEmail({
      kind: 'change-email',
      // Sent to the address being claimed, not to the current one.
      to: delivery.newEmail,
      name: delivery.user.name ?? '',
      url: delivery.url,
      locale: this.resolveLocale(delivery),
    });
  }

  /**
   * Request language wins over the stored user preference, so a user browsing
   * in another language gets the email they expect.
   */
  private resolveLocale(delivery: AuthEmailDelivery): string {
    const { headerName, queryName, defaultLocale } = this.i18nConfiguration;
    const source: AuthEmailLocaleSource = delivery.localeSource ?? {};

    const fromRequest = resolveLocaleFromSource(
      {
        headers: (source.headers ?? {}) as never,
        query: (source.query ?? {}) as never,
      },
      headerName,
      queryName,
    );

    return fromRequest || delivery.user.locale || defaultLocale || 'en-US';
  }
}
