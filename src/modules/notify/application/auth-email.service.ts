import type {
  AuthEmailKind,
  SendAuthEmailParams,
} from '../domain/auth-email.port.js';
import { AuthEmailPort } from '../domain/auth-email.port.js';
import type { EmailProviderPort } from '../domain/email.provider.port.js';

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

/** Minimal translation surface, so the service does not depend on nestjs-i18n. */
export interface AuthEmailTranslator {
  translate(key: string, options: { lang: string }): Promise<string> | string;
}

export interface AuthEmailLogger {
  error(value: unknown, message?: string): void;
}

export class AuthEmailService extends AuthEmailPort {
  constructor(
    private readonly emailProvider: EmailProviderPort,
    private readonly translator: AuthEmailTranslator,
    private readonly logger: AuthEmailLogger,
    private readonly defaultLocale: string,
  ) {
    super();
  }

  /**
   * Delivery failures are logged and swallowed for every kind: an
   * authentication operation must never fail because its notification did.
   * Delivery itself is queued, so transient provider errors are retried there.
   */
  async sendAuthEmail(params: SendAuthEmailParams): Promise<void> {
    const definition = AUTH_EMAILS[params.kind];
    const locale = params.locale || this.defaultLocale;

    try {
      await this.emailProvider.sendEmail({
        to: params.to,
        subject: await this.translator.translate(definition.subjectKey, {
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
