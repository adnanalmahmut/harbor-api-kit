import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/domain/exceptions/error-definitions.js';
import type { ValidationIssue } from '#src/core/domain/types/validation-issue.type.js';

export class ValidationError extends AppException {
  constructor(messageKey: string, issues: ValidationIssue[]) {
    super({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey,
      details: { issues },
    });
  }
}
