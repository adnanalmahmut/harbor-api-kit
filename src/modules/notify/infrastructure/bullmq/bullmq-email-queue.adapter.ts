import { AppConfigService } from '#src/core/index.js';
import {
  type EmailProviderPort,
  type SendEmailParams,
} from '#src/modules/notify/domain/ports/email.provider.port.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class BullMqEmailQueueAdapter implements EmailProviderPort {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BullMqEmailQueueAdapter.name);
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    const { retryAttempts, retryDelayMs } = this.config.notify().email;
    this.logger.info(`Enqueuing email to ${params.to}`);
    await this.emailQueue.add('send-email', params, {
      removeOnComplete: true, // Auto remove on success
      attempts: retryAttempts,
      backoff: {
        type: 'exponential',
        delay: retryDelayMs,
      },
    });
  }
}
