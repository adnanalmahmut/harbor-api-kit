import type { SendEmailParams } from '#src/modules/notify/domain/email.provider.port.js';
import { ResendEmailProvider } from '#src/modules/notify/infrastructure/resend/resend.provider.js';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
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
