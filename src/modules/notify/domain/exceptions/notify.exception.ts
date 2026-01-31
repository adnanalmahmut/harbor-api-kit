import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';

export class NotifyException extends AppException {
  static providerError(detail?: string) {
    return new NotifyException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'errors.notify.provider_error',
      cause: detail ? new Error(detail) : undefined,
    });
  }

  static templateNotFound(templateId: string) {
    return new NotifyException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'errors.notify.template_not_found',
      cause: new Error(`Template ${templateId} not found`),
    });
  }
}
