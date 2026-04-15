import { AppConfigModule, QueueModule } from '#src/core/index.js';
import { BullMqEmailQueueAdapter } from './infrastructure/bullmq/bullmq-email-queue.adapter.js';
import { EmailProcessor } from './infrastructure/bullmq/email.processor.js';
import { ResendEmailProvider } from './infrastructure/resend/resend.provider.js';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AppConfigModule,
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
  ],
  exports: ['EmailProviderPort'],
})
export class NotifyModule {}
