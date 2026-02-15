import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/domain/exceptions/error-definitions.js';

export class NotifyException extends AppException {
  static providerError(detail?: string) {
    return new NotifyException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'notify.errors.provider_error',
      cause: detail ? new Error(detail) : undefined,
    });
  }

  static templateNotFound(templateId: string) {
    return new NotifyException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'notify.errors.template_not_found',
      cause: new Error(`Template ${templateId} not found`),
    });
  }
}
