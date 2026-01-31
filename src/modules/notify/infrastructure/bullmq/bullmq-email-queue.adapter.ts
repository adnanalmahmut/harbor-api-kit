import {
  type EmailProviderPort,
  type SendEmailParams,
} from '#src/modules/notify/domain/ports/email.provider.port.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class BullMqEmailQueueAdapter implements EmailProviderPort {
  private readonly logger = new Logger(BullMqEmailQueueAdapter.name);

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  async sendEmail(params: SendEmailParams): Promise<void> {
    this.logger.log(`Enqueuing email to ${params.to}`);
    await this.emailQueue.add('send-email', params, {
      removeOnComplete: true, // Auto remove on success
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
