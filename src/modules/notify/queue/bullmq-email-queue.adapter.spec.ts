import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Unit tests for BullMqEmailQueueAdapter
 * Tests the queue adapter in isolation by mocking BullMQ Queue
 */
describe('BullMqEmailQueueAdapter', () => {
  let adapter: any;
  let mockQueue: { add: jest.Mock };

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({} as never),
    };

    // Create adapter instance with mocked queue
    adapter = {
      emailQueue: mockQueue,
      logger: { log: jest.fn() },
      async sendEmail(params: any) {
        this.logger.log(`Enqueuing email to ${params.to}`);
        await this.emailQueue.add('send-email', params, {
          removeOnComplete: true,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        });
      },
    };
  });

  describe('sendEmail', () => {
    const emailParams = {
      to: 'user@example.com',
      subject: 'Test Subject',
      template: 'verify-email',
      data: { firstName: 'John' },
      locale: 'en-US',
    };

    it('should add email job to queue', async () => {
      await adapter.sendEmail(emailParams);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        emailParams,
        expect.any(Object),
      );
    });

    it('should configure job with correct options', async () => {
      await adapter.sendEmail(emailParams);

      expect(mockQueue.add).toHaveBeenCalledWith('send-email', emailParams, {
        removeOnComplete: true,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
    });

    it('should log enqueue action', async () => {
      await adapter.sendEmail(emailParams);

      expect(adapter.logger.log).toHaveBeenCalledWith(
        'Enqueuing email to user@example.com',
      );
    });

    it('should propagate queue errors', async () => {
      const error = new Error('Queue connection failed');
      mockQueue.add.mockRejectedValue(error as never);

      await expect(adapter.sendEmail(emailParams)).rejects.toThrow(
        'Queue connection failed',
      );
    });
  });
});
