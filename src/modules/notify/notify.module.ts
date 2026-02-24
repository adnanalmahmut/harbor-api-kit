import { AppConfigModule, QueueModule } from '#src/core/index.js';
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
