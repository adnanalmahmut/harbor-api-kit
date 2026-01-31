import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import type { ValidationIssue } from '#src/core/types/api.types.js';

export class ValidationError extends AppException {
  constructor(messageKey: string, issues: ValidationIssue[]) {
    super({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey,
      details: { issues },
    });
  }
}
