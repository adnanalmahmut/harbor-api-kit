import type { SendEmailParams } from '#src/modules/notify/domain/ports/email.provider.port.js';
import { ResendEmailProvider } from '#src/modules/notify/infrastructure/resend/resend.provider.js';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly resendProvider: ResendEmailProvider) {
    super();
  }

  async process(job: Job<SendEmailParams, void, string>): Promise<void> {
    this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);
    try {
      await this.resendProvider.sendEmail(job.data);
      this.logger.log(`Email job ${job.id} completed`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed`, error);
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
