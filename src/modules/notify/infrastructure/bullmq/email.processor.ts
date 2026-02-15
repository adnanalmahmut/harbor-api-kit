import type { SendEmailParams } from '#src/modules/notify/domain/ports/email.provider.port.js';
import { ResendEmailProvider } from '#src/modules/notify/infrastructure/resend/resend.provider.js';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

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
    this.logger.info(`Processing email job ${job.id} for ${job.data.to}`);
    try {
      await this.resendProvider.sendEmail(job.data);
      this.logger.info(`Email job ${job.id} completed`);
    } catch (error) {
      this.logger.error(error, `Email job ${job.id} failed`);
      throw error; // Trigger retry
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts`,
    );
  }
}
