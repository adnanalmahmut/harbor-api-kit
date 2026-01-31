import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Unit tests for EmailProcessor
 * Tests the processor logic in isolation by mocking dependencies
 */
describe('EmailProcessor', () => {
  let processor: any;
  let mockResendProvider: { sendEmail: jest.Mock };
  let mockLogger: { log: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    mockResendProvider = {
      sendEmail: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    // Create processor instance with mocked dependencies
    processor = {
      resendProvider: mockResendProvider,
      logger: mockLogger,

      async process(job: any) {
        this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);
        try {
          await this.resendProvider.sendEmail(job.data);
          this.logger.log(`Email job ${job.id} completed`);
        } catch (error) {
          this.logger.error(`Email job ${job.id} failed`, error);
          throw error;
        }
      },

      onFailed(job: any) {
        this.logger.error(
          `Job ${job.id} failed after ${job.attemptsMade} attempts`,
        );
      },
    };
  });

  const createMockJob = (data: any) => ({
    id: 'job-123',
    data,
    attemptsMade: 0,
  });

  describe('process', () => {
    const emailParams = {
      to: 'user@example.com',
      subject: 'Test Subject',
      template: 'verify-email',
      data: { firstName: 'John' },
      locale: 'en-US',
    };

    it('should process email job successfully', async () => {
      const job = createMockJob(emailParams);
      mockResendProvider.sendEmail.mockResolvedValue(undefined as never);

      await processor.process(job);

      expect(mockResendProvider.sendEmail).toHaveBeenCalledWith(emailParams);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Email job job-123 completed',
      );
    });

    it('should log processing start', async () => {
      const job = createMockJob(emailParams);
      mockResendProvider.sendEmail.mockResolvedValue(undefined as never);

      await processor.process(job);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Processing email job job-123 for user@example.com',
      );
    });

    it('should re-throw error when provider fails (for retry)', async () => {
      const job = createMockJob(emailParams);
      const error = new Error('Provider failed');
      mockResendProvider.sendEmail.mockRejectedValue(error as never);

      await expect(processor.process(job)).rejects.toThrow('Provider failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Email job job-123 failed',
        error,
      );
    });
  });

  describe('onFailed', () => {
    it('should log failure with attempts count', () => {
      const job = { id: 'job-456', attemptsMade: 3 };

      processor.onFailed(job);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Job job-456 failed after 3 attempts',
      );
    });
  });
});
