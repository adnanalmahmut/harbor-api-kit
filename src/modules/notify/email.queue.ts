import { notificationConfig } from '#src/config/index.js';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { maskEmail } from './mask-email.js';
import { EmailProviderPort, type SendEmailParams } from './notify.ports.js';
import { ResendEmailProvider } from './resend.provider.js';

/**
 * Both halves of the email queue: the adapter that enqueues and the worker that
 * consumes. They share one queue name and one retry policy, so keeping them in
 * separate files split a single decision — "email delivery is queued, with N
 * exponential retries" — across two places.
 *
 * Every log line masks the recipient; a raw address must never reach the stream.
 */
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

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly resendProvider: ResendEmailProvider,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(EmailProcessor.name);
  }

  async process(job: Job<SendEmailParams, void, string>): Promise<void> {
    const toMasked = maskEmail(job.data.to);

    this.logger.info({
      msg: 'Processing email job',
      jobId: job.id,
      toMasked,
      template: job.data.template,
      locale: job.data.locale,
    });

    try {
      await this.resendProvider.sendEmail(job.data);

      this.logger.info({
        msg: 'Email job completed',
        jobId: job.id,
      });
    } catch (error) {
      this.logger.error({
        msg: 'Email job failed',
        jobId: job.id,
        toMasked,
        template: job.data.template,
        locale: job.data.locale,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      this.logger.debug({ err: error, jobId: job.id }, 'Email job raw error');

      // Re-thrown so BullMQ counts the attempt and applies the backoff.
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error({
      msg: 'Job failed after attempts',
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  }
}
