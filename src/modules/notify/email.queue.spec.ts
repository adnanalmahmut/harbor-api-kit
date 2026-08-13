import { jest } from '@jest/globals';
import type { Job, Queue } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import { BullMqEmailQueueAdapter, EmailProcessor } from './email.queue.js';
import type { SendEmailParams } from './notify.ports.js';
import type { ResendEmailProvider } from './resend.provider.js';

const EMAIL: SendEmailParams = {
  to: 'user@example.com',
  subject: 'Test Subject',
  template: 'verify-email',
  data: { name: 'John' },
  locale: 'en-US',
};

function createLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };
}

describe('BullMqEmailQueueAdapter', () => {
  let queue: { add: jest.Mock };
  let logger: ReturnType<typeof createLogger>;
  let adapter: BullMqEmailQueueAdapter;

  beforeEach(() => {
    queue = { add: jest.fn(() => Promise.resolve({})) as jest.Mock };
    logger = createLogger();
    adapter = new BullMqEmailQueueAdapter(
      queue as unknown as Queue,
      { email: { retryAttempts: 5, retryDelayMs: 5000 } } as never,
      logger as unknown as PinoLogger,
    );
  });

  it('enqueues the job with the retry policy from configuration', async () => {
    await adapter.sendEmail(EMAIL);

    expect(queue.add).toHaveBeenCalledWith('send-email', EMAIL, {
      removeOnComplete: true,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
  });

  it('never writes the raw recipient address to the log', async () => {
    await adapter.sendEmail(EMAIL);

    const [entry] = logger.debug.mock.calls[0] as [Record<string, unknown>];
    expect(entry.toMasked).not.toBe(EMAIL.to);
    expect(JSON.stringify(entry)).not.toContain(EMAIL.to);
  });

  it('propagates queue failures to the caller', async () => {
    queue.add.mockImplementation(() =>
      Promise.reject(new Error('Queue connection failed')),
    );

    await expect(adapter.sendEmail(EMAIL)).rejects.toThrow(
      'Queue connection failed',
    );
  });
});

describe('EmailProcessor', () => {
  let provider: { sendEmail: jest.Mock };
  let logger: ReturnType<typeof createLogger>;
  let processor: EmailProcessor;

  const job = (data: SendEmailParams) =>
    ({ id: 'job-123', data, attemptsMade: 0 }) as unknown as Job<
      SendEmailParams,
      void,
      string
    >;

  beforeEach(() => {
    provider = { sendEmail: jest.fn(() => Promise.resolve()) as jest.Mock };
    logger = createLogger();
    processor = new EmailProcessor(
      provider as unknown as ResendEmailProvider,
      logger as unknown as PinoLogger,
    );
  });

  it('hands the job payload to the provider unchanged', async () => {
    await processor.process(job(EMAIL));

    expect(provider.sendEmail).toHaveBeenCalledWith(EMAIL);
  });

  it('re-throws provider failures so BullMQ retries the job', async () => {
    provider.sendEmail.mockImplementation(() =>
      Promise.reject(new Error('Provider failed')),
    );

    await expect(processor.process(job(EMAIL))).rejects.toThrow(
      'Provider failed',
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('never writes the raw recipient address to the log, even on failure', async () => {
    provider.sendEmail.mockImplementation(() =>
      Promise.reject(new Error('Provider failed')),
    );

    await expect(processor.process(job(EMAIL))).rejects.toThrow();

    const logged = JSON.stringify([
      ...logger.info.mock.calls,
      ...logger.error.mock.calls,
    ]);
    expect(logged).not.toContain(EMAIL.to);
  });
});
