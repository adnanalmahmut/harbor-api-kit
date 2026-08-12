import { QueueModule } from '#src/core/index.js';
import { i18nConfig } from '#src/config/index.js';
import { AuthEmailService } from './application/auth-email.service.js';
import { AuthEmailPort } from './domain/auth-email.port.js';
import type { EmailProviderPort } from './domain/email.provider.port.js';
import { BullMqEmailQueueAdapter } from './infrastructure/bullmq/bullmq-email-queue.adapter.js';
import { EmailProcessor } from './infrastructure/bullmq/email.processor.js';
import { ResendEmailProvider } from './infrastructure/resend/resend.provider.js';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { PinoLogger } from 'nestjs-pino';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [
    ResendEmailProvider,
    EmailProcessor,
    BullMqEmailQueueAdapter,
    {
      provide: 'EmailProviderPort',
      useClass: BullMqEmailQueueAdapter,
    },
    {
      provide: AuthEmailPort,
      useFactory: (
        emailProvider: EmailProviderPort,
        i18n: I18nService,
        logger: PinoLogger,
        i18nConfiguration: ConfigType<typeof i18nConfig>,
      ) => {
        logger.setContext(AuthEmailService.name);
        return new AuthEmailService(
          emailProvider,
          {
            translate: (key, options) => i18n.translate(key, options),
          },
          logger,
          i18nConfiguration.defaultLocale,
        );
      },
      inject: ['EmailProviderPort', I18nService, PinoLogger, i18nConfig.KEY],
    },
  ],
  exports: ['EmailProviderPort', AuthEmailPort],
})
export class NotifyModule {}
