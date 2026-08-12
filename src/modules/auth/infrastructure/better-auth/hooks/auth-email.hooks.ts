import { i18nConfig } from '#src/config/index.js';
import { resolveLocaleFromSource } from '#src/core/index.js';
import type {
  AuthEmailDelivery,
  AuthEmailLocaleSource,
  AuthEmailSenderPort,
  ChangeEmailConfirmationDelivery,
} from '../../../domain/index.js';
import { AuthEmailPort } from '#src/modules/notify/index.js';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

/**
 * Translates Better Auth's email callbacks into notification intents. It owns
 * one decision only — which language to send in. Templates, subjects, queuing,
 * retries and failure handling belong to the notify module.
 */
@Injectable()
export class AuthEmailHooks implements AuthEmailSenderPort {
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
