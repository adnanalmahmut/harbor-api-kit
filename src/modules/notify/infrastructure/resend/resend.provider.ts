import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import {
  EmailProviderPort,
  type SendEmailParams,
} from '#src/modules/notify/domain/ports/email.provider.port.js';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Resend } from 'resend';

import { NotifyException } from '#src/modules/notify/domain/exceptions/notify.exception.js';

@Injectable()
export class ResendEmailProvider implements EmailProviderPort {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly resend: Resend;

  constructor(private readonly config: AppConfigService) {
    const apiKey = (this.config.resend() as any).apiKey;
    this.resend = new Resend(apiKey);
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    const { to, subject, template, data, locale = 'en-US' } = params;

    try {
      const html = await this.loadTemplate(template, locale, data);

      const from = `${(this.config.resend() as any).fromName} <${(this.config.resend() as any).fromEmail}>`;

      this.logger.log(
        `Sending email to ${to} [Template: ${template}, Locale: ${locale}]`,
      );

      await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
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

      content = content.replace(/{{\s*([\w]+)\s*}}/g, (match, key) => {
        const val = data[key];
        if (val !== undefined) {
          return String(val);
        }
        this.logger.warn(`Missing template variable: ${key}`);
        return match;
      });

      return content;
    } catch (error) {
      this.logger.warn(`Template not found: ${templatePath}.`, error);
      throw NotifyException.templateNotFound(templateName);
    }
  }
}
