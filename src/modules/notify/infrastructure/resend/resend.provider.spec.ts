import { NotifyException } from '#src/modules/notify/domain/exceptions/notify.exception.js';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Unit tests for ResendEmailProvider
 * Tests the email provider logic in isolation by mocking external dependencies
 */
describe('ResendEmailProvider', () => {
  let provider: any;
  let mockResend: { emails: { send: jest.Mock } };
  let mockConfig: any;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
  let mockFsReadFile: jest.Mock;

  beforeEach(() => {
    mockResend = {
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'email-123' } as never),
      },
    };

    mockConfig = {
      resend: () => ({
        apiKey: 'test-api-key',
        fromName: 'Test App',
        fromEmail: 'noreply@test.com',
      }),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockFsReadFile = jest.fn();

    // Create provider instance with mocked dependencies
    provider = {
      resend: mockResend,
      config: mockConfig,
      logger: mockLogger,

      async sendEmail(params: any) {
        const { to, subject, template, data, locale = 'en-US' } = params;

        try {
          const html = await this.loadTemplate(template, locale, data);
          const from = `${this.config.resend().fromName} <${this.config.resend().fromEmail}>`;

          this.logger.log(
            `Sending email to ${to} [Template: ${template}, Locale: ${locale}]`,
          );

          await this.resend.emails.send({ from, to, subject, html });
          this.logger.log(`Email sent successfully to ${to}`);
        } catch (error: any) {
          this.logger.error(`Failed to send email to ${to}`, error);
          if (error instanceof NotifyException) throw error;
          throw NotifyException.providerError(error.message || 'Unknown error');
        }
      },

      async loadTemplate(
        templateName: string,
        locale: string,
        data: Record<string, any>,
      ) {
        try {
          let content: string = (await mockFsReadFile(
            templateName,
            locale,
          )) as string;

          content = content.replace(
            /\{\{\s*([\w]+)\s*\}\}/g,
            (match: string, key: string) => {
              const val = data[key];
              if (val !== undefined) return String(val);
              this.logger.warn(`Missing template variable: ${key}`);
              return match;
            },
          );

          return content;
        } catch (error) {
          this.logger.warn(`Template not found: ${templateName}.`, error);
          throw NotifyException.templateNotFound(templateName);
        }
      },
    };
  });

  describe('sendEmail', () => {
    const validParams = {
      to: 'user@example.com',
      subject: 'Test Subject',
      template: 'verify-email',
      data: { firstName: 'John', link: 'https://example.com/verify' },
      locale: 'en-US',
    };

    it('should send email successfully with valid template', async () => {
      const templateContent =
        '<h1>Hello {{firstName}}</h1><a href="{{link}}">Verify</a>';
      mockFsReadFile.mockResolvedValue(templateContent as never);

      await provider.sendEmail(validParams);

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Test App <noreply@test.com>',
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello John</h1><a href="https://example.com/verify">Verify</a>',
      });
    });

    it('should replace template variables correctly', async () => {
      const templateContent = '{{firstName}} - {{link}} - {{missing}}';
      mockFsReadFile.mockResolvedValue(templateContent as never);

      await provider.sendEmail(validParams);

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: 'John - https://example.com/verify - {{missing}}',
        }),
      );
    });

    it('should log warning for missing template variables', async () => {
      const templateContent = '{{firstName}} - {{unknown}}';
      mockFsReadFile.mockResolvedValue(templateContent as never);

      await provider.sendEmail(validParams);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Missing template variable: unknown',
      );
    });

    it('should throw NotifyException.templateNotFound when template does not exist', async () => {
      mockFsReadFile.mockRejectedValue(new Error('ENOENT') as never);

      await expect(provider.sendEmail(validParams)).rejects.toThrow(
        NotifyException,
      );
    });

    it('should throw NotifyException.providerError when Resend API fails', async () => {
      mockFsReadFile.mockResolvedValue('<h1>Hello</h1>' as never);
      mockResend.emails.send.mockRejectedValue(
        new Error('API rate limit exceeded') as never,
      );

      await expect(provider.sendEmail(validParams)).rejects.toThrow(
        NotifyException,
      );
    });

    it('should use default locale en-US when not provided', async () => {
      const paramsWithoutLocale = { ...validParams, locale: undefined };
      mockFsReadFile.mockResolvedValue('<h1>Hello</h1>' as never);

      await provider.sendEmail(paramsWithoutLocale);

      expect(mockFsReadFile).toHaveBeenCalledWith('verify-email', 'en-US');
    });

    it('should log email sending progress', async () => {
      mockFsReadFile.mockResolvedValue('<h1>Hello</h1>' as never);

      await provider.sendEmail(validParams);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Sending email to user@example.com [Template: verify-email, Locale: en-US]',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Email sent successfully to user@example.com',
      );
    });
  });
});
