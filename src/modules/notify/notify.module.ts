import { QueueModule } from '#src/infrastructure/queue/queue.module.js';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthEmailService } from './auth-email.service.js';
import { BullMqEmailQueueAdapter, EmailProcessor } from './email.queue.js';
import { AuthEmailPort, EmailProviderPort } from './notify.ports.js';
import { ResendEmailProvider } from './resend.provider.js';

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
