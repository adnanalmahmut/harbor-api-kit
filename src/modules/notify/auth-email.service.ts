import { i18nConfig } from '#src/config/index.js';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { PinoLogger } from 'nestjs-pino';
import {
  AuthEmailPort,
  EmailProviderPort,
  type AuthEmailKind,
  type SendAuthEmailParams,
} from './notify.ports.js';

type AuthEmailDefinition = {
  template: string;
  subjectKey: string;
};

const AUTH_EMAILS = {
  'verify-email': {
    template: 'verify-email',
    subjectKey: 'auth.emails.subjects.verify_email',
  },
  'reset-password': {
    template: 'reset-password',
    subjectKey: 'auth.emails.subjects.reset_password',
  },
  'change-email': {
    template: 'verify-change-email',
    subjectKey: 'auth.emails.subjects.verify_change_email',
  },
} as const satisfies Record<AuthEmailKind, AuthEmailDefinition>;

@Injectable()
export class AuthEmailService extends AuthEmailPort {
  constructor(
    private readonly emailProvider: EmailProviderPort,
    private readonly i18n: I18nService,
    private readonly logger: PinoLogger,
    @Inject(i18nConfig.KEY)
    private readonly i18nConfiguration: ConfigType<typeof i18nConfig>,
  ) {
    super();
    this.logger.setContext(AuthEmailService.name);
  }

  /**
   * Delivery failures are logged and swallowed for every kind: an
   * authentication operation must never fail because its notification did.
   * Delivery itself is queued, so transient provider errors are retried there.
   */
  async sendAuthEmail(params: SendAuthEmailParams): Promise<void> {
    const definition = AUTH_EMAILS[params.kind];
    const locale = params.locale || this.i18nConfiguration.defaultLocale;

    try {
      await this.emailProvider.sendEmail({
        to: params.to,
        subject: await this.i18n.translate(definition.subjectKey, {
          lang: locale,
        }),
        template: definition.template,
        data: { name: params.name, link: params.url },
        locale,
      });
    } catch (error) {
      this.logger.error(
        error,
        `Failed to queue the ${params.kind} authentication email`,
      );
    }
  }
}
