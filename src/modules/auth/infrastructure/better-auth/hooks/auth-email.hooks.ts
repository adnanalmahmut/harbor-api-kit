import {
  AppConfigService,
  resolveLocaleFromSource,
  type RequestContext,
} from '#src/core/index.js';
import type {
  AuthEmailSenderPort,
  ChangeEmailVerificationParams,
} from '#src/modules/auth/domain/index.js';
import type { EmailProviderPort } from '#src/modules/notify/domain/ports/email.provider.port.js';
import { Inject, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthEmailHooks implements AuthEmailSenderPort {
  constructor(
    private readonly config: AppConfigService,
    @Inject('EmailProviderPort')
    private readonly emailProvider: EmailProviderPort,
    private readonly i18n: I18nService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthEmailHooks.name);
  }

  private getLocale(user: any, context?: RequestContext): string {
    const { headerName, queryName } = this.config.i18n();
    let locale = user.locale;

    if (context) {
      const resolved = resolveLocaleFromSource(
        {
          headers: context.headers as any,
          query: (context.query || {}) as any,
        },
        headerName,
        queryName,
      );
      if (resolved) locale = resolved;
    }

    return locale || this.config.i18n().defaultLocale || 'en-US';
  }

  async sendVerificationEmail(
    params: { user: any; token: string },
    context: RequestContext,
  ) {
    const { user, token } = params;
    const locale = this.getLocale(user, context);
    const betterAuthUrl = this.config.auth().betterAuthUrl;

    try {
      await this.emailProvider.sendEmail({
        to: user.email,
        subject: await this.i18n.translate(
          'auth.emails.subjects.verify_email',
          {
            lang: locale,
          },
        ),
        template: 'verify-email',
        data: {
          firstName: user.firstName || user.name || '',
          link: `${betterAuthUrl}/verify-email?token=${token}`,
        },
        locale,
      });
    } catch (error) {
      this.logger.error(error, 'Failed to send verification email via hook');
    }
  }

  async sendResetPasswordEmail(
    params: { user: any; token: string; url: string },
    context: RequestContext,
  ) {
    const { user, token } = params;
    const locale = this.getLocale(user, context);
    const betterAuthUrl = this.config.auth().betterAuthUrl;

    try {
      await this.emailProvider.sendEmail({
        to: user.email,
        subject: await this.i18n.translate(
          'auth.emails.subjects.reset_password',
          {
            lang: locale,
          },
        ),
        template: 'reset-password',
        data: {
          firstName: user.firstName || user.name || '',
          link: `${betterAuthUrl}/reset-password/${token}`,
        },
        locale,
      });
    } catch (error) {
      this.logger.error(error, 'Failed to send reset password email via hook');
      // Rethrow to allow BetterAuthProvider to catch and map it
      throw error;
    }
  }

  async sendChangeEmailVerification(
    params: ChangeEmailVerificationParams,
    context: RequestContext,
  ) {
    const { user, token, newEmail } = params;
    const locale = this.getLocale(user, context);
    const betterAuthUrl = this.config.auth().betterAuthUrl;

    try {
      await this.emailProvider.sendEmail({
        to: newEmail, // Send to the NEW email
        subject: await this.i18n.translate(
          'auth.emails.subjects.verify_change_email',
          {
            lang: locale,
          },
        ),
        template: 'verify-change-email',
        data: {
          firstName: user.firstName || user.name || '',
          link: `${betterAuthUrl}/change-email/verify?token=${token}`,
        },
        locale,
      });
    } catch (error) {
      this.logger.error(
        error,
        'Failed to send change email verification via hook',
      );
    }
  }
}
