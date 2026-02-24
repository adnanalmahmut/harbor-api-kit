import { AppConfigService } from '#src/core/index.js';
import {
  EmailProviderPort,
  type SendEmailParams,
} from '#src/modules/notify/domain/ports/email.provider.port.js';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PinoLogger } from 'nestjs-pino';
import * as path from 'path';
import { Resend } from 'resend';

import { NotifyException } from '#src/modules/notify/domain/exceptions/notify.exception.js';

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

    try {
      const html = await this.loadTemplate(template, locale, data);

      const from = `${this.config.email().from.name} <${this.config.email().from.email}>`;

      this.logger.info(
        `Sending email to ${to} [Template: ${template}, Locale: ${locale}]`,
      );

      await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      this.logger.info(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(error, `Failed to send email to ${to}`);
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
    const projectRoot = process.cwd();
    const templatePath = path.join(
      projectRoot,
      'locales',
      locale,
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
        this.logger.warn(`Missing template variable: ${key}`);
        return match;
      });

      return content;
    } catch (error) {
      this.logger.warn(error, `Template not found: ${templatePath}.`);
      throw NotifyException.templateNotFound(templateName);
    }
  }
}
