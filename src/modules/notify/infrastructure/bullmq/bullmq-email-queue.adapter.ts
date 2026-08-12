import { notificationConfig } from '#src/config/index.js';
import {
  type EmailProviderPort,
  type SendEmailParams,
} from '../../domain/email.provider.port.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

function maskEmail(email: string): string {
  const [localPart = '', domain = ''] = email.split('@');
  if (!domain) return '[invalid-email]';

  const localMasked =
    localPart.length <= 2
      ? `${localPart[0] ?? '*'}*`
      : `${localPart.slice(0, 2)}***`;

  const domainParts = domain.split('.');
  const domainName = domainParts[0] ?? '';
  const tld = domainParts.slice(1).join('.') || '';

  const domainMasked =
    domainName.length <= 2
      ? `${domainName[0] ?? '*'}*`
      : `${domainName.slice(0, 2)}***`;

  return tld
    ? `${localMasked}@${domainMasked}.${tld}`
    : `${localMasked}@${domainMasked}`;
}

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
