import { i18nConfig } from '#src/config/index.js';
import { resolveLocaleFromSource } from '#src/infrastructure/i18n/i18n.utils.js';
import { AuthEmailPort } from '#src/modules/notify/notify.ports.js';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type {
  AuthEmailDelivery,
  AuthEmailLocaleSource,
  AuthEmailSenderPort,
  ChangeEmailConfirmationDelivery,
} from './auth.ports.js';

/**
 * Translates Better Auth's email callbacks into notification intents. It owns
 * one decision only — which language to send in. Templates, subjects, queuing,
 * retries and failure handling belong to the notify module.
 *
 * This is the module's only adapter now, so it has its own file: the two that
 * shared `auth.adapters.ts` with it are gone.
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
