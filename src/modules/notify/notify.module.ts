import { QueueModule } from '#src/infrastructure/queue/queue.module.js';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthEmailService } from './auth-email.service.js';
import { AuthEmailPort, EmailProviderPort } from './notify.ports.js';
import { ResendEmailProvider } from './providers/resend.provider.js';
import { BullMqEmailQueueAdapter } from './queue/bullmq-email-queue.adapter.js';
import { EmailProcessor } from './queue/email.processor.js';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [
    // Sending is queued; the worker is what actually talks to Resend.
    ResendEmailProvider,
    EmailProcessor,
    BullMqEmailQueueAdapter,
    { provide: EmailProviderPort, useExisting: BullMqEmailQueueAdapter },
    { provide: AuthEmailPort, useClass: AuthEmailService },
  ],
  exports: [EmailProviderPort, AuthEmailPort],
})
export class NotifyModule {}
