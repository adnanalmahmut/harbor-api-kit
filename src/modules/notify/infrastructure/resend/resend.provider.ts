import { AppConfigService, resolveSupportedLocale } from '#src/core/index.js';
import {
  EmailProviderPort,
  type SendEmailParams,
} from '#src/modules/notify/domain/email.provider.port.js';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PinoLogger } from 'nestjs-pino';
import * as path from 'path';
import { Resend } from 'resend';

import { NotifyException } from '#src/modules/notify/domain/exceptions/notify.exception.js';

function maskEmail(email: string): string {
  const [localPart = '', domain = ''] = email.split('@');
  if (!domain) return '[invalid-email]';

  const localMasked =
    localPart.length <= 2
      ? `${localPart[0] ?? '*'}*`
      : `${localPart.slice(0, 2)}***`;

  const domainParts = domain.split('.');
  const domainName = domainParts[0] ?? '';
  const tld = domainParts.slice(1).join('.') || '';

  const domainMasked =
    domainName.length <= 2
      ? `${domainName[0] ?? '*'}*`
      : `${domainName.slice(0, 2)}***`;

  return tld
    ? `${localMasked}@${domainMasked}.${tld}`
    : `${localMasked}@${domainMasked}`;
}

@Injectable()
export class ResendEmailProvider implements EmailProviderPort {
  private readonly resend: Resend;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResendEmailProvider.name);
    const apiKey = this.config.email().resend.apiKey;
    this.resend = new Resend(apiKey);
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    const { to, subject, template, data, locale = 'en-US' } = params;
    const toMasked = maskEmail(to);

    try {
      const html = await this.loadTemplate(template, locale, data);

      const from = `${this.config.email().from.name} <${this.config.email().from.email}>`;

      this.logger.info({
        msg: 'Sending email',
        toMasked,
        template,
        locale,
      });

      await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      this.logger.info({
        msg: 'Email sent successfully',
        toMasked,
        template,
        locale,
      });
    } catch (error) {
      // لا تضع البريد الخام داخل الرسالة النصية
      this.logger.error({
        msg: 'Failed to send email',
        toMasked,
        template,
        locale,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // اختياري: فقط على debug إذا احتجت تتبع أعمق (قد يحتوي PII حسب مزود الخدمة)
      // this.logger.debug({ err: error }, 'Email provider raw error');

      if (error instanceof NotifyException) throw error;

      throw NotifyException.providerError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async loadTemplate(
    templateName: string,
    locale: string,
    data: Record<string, any>,
  ): Promise<string> {
    const resolvedLocale =
      resolveSupportedLocale(locale) ??
      this.config.i18n().defaultLocale ??
      'en-US';
    const projectRoot = process.cwd();
    const templatePath = path.join(
      projectRoot,
      'locales',
      resolvedLocale,
      'emails',
      `${templateName}.html`,
    );

    try {
      let content = await fs.readFile(templatePath, 'utf-8');

      const defaults = {
        brandName: this.config.email().from.name || this.config.app().name,
        year: new Date().getFullYear(),
        supportEmail: this.config.email().from.email,
        websiteUrl: this.config.app().frontendPublicUrl,
      };

      const finalData: Record<string, any> = { ...defaults, ...data };

      content = content.replace(/{{\s*([\w]+)\s*}}/g, (match, key) => {
        const val = finalData[key];
        if (val !== undefined) {
          return String(val);
        }
        this.logger.warn({
          msg: 'Missing template variable',
          key,
          templateName,
          locale: resolvedLocale,
        });
        return match;
      });

      return content;
    } catch (error) {
      // الأفضل عدم كشف المسار الكامل في الإنتاج
      this.logger.warn({
        msg: 'Email template not found',
        templateName,
        locale: resolvedLocale,
        requestedLocale: locale,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw NotifyException.templateNotFound(templateName);
    }
  }
}
