import { NotifyException } from './notify.exception.js';

describe('NotifyException', () => {
  describe('providerError', () => {
    it('should create exception with correct messageKey', () => {
      const exception = NotifyException.providerError('test detail');

      expect(exception).toBeInstanceOf(NotifyException);
      expect(exception.messageKey).toBe('notify.errors.provider_error');
    });

    it('should include detail as cause', () => {
      const exception = NotifyException.providerError('API failed');

      expect(exception.cause).toBeInstanceOf(Error);
      expect((exception.cause as Error).message).toBe('API failed');
    });

    it('should work without detail', () => {
      const exception = NotifyException.providerError();

      expect(exception.messageKey).toBe('notify.errors.provider_error');
      expect(exception.cause).toBeUndefined();
    });
  });

  describe('templateNotFound', () => {
    it('should create exception with correct messageKey', () => {
      const exception = NotifyException.templateNotFound('verify-email');

      expect(exception).toBeInstanceOf(NotifyException);
      expect(exception.messageKey).toBe('notify.errors.template_not_found');
    });

    it('should include template name in cause', () => {
      const exception = NotifyException.templateNotFound('reset-password');

      expect(exception.cause).toBeInstanceOf(Error);
      expect((exception.cause as Error).message).toContain('reset-password');
    });
  });
});
