import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { QueueModule } from '#src/core/infrastructure/queue/queue.module.js';
import { BullMqEmailQueueAdapter } from '#src/modules/notify/infrastructure/bullmq/bullmq-email-queue.adapter.js';
import { EmailProcessor } from '#src/modules/notify/infrastructure/bullmq/email.processor.js';
import { ResendEmailProvider } from '#src/modules/notify/infrastructure/resend/resend.provider.js';
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
    ResendEmailProvider, // The actual sender (used by processor)
    EmailProcessor, // The consumer
    BullMqEmailQueueAdapter, // The producer adapter
    {
      provide: 'EmailProviderPort',
      useClass: BullMqEmailQueueAdapter, // Public API uses queue
    },
  ],
  exports: ['EmailProviderPort'],
})
export class NotifyModule {}
