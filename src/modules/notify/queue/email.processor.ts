import type { SendEmailParams } from '../notify.ports.js';
import { ResendEmailProvider } from '../providers/resend.provider.js';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { maskEmail } from '../mask-email.js';

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
