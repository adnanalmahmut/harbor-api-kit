import { notificationConfig } from '#src/config/index.js';
import { EmailProviderPort, type SendEmailParams } from '../notify.ports.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { maskEmail } from '../mask-email.js';

@Injectable()
export class BullMqEmailQueueAdapter implements EmailProviderPort {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    @Inject(notificationConfig.KEY)
    private readonly config: ConfigType<typeof notificationConfig>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BullMqEmailQueueAdapter.name);
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    const { retryAttempts, retryDelayMs } = this.config.email;
    this.logger.debug({
      msg: 'Enqueuing email job',
      toMasked: maskEmail(params.to),
      retryAttempts,
      retryDelayMs,
    });
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
