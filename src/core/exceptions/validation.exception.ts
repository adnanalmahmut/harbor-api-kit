import type { ValidationIssue } from '#src/core/types/api.types.js';
import { AppException } from './app-exception.js';
import { AppErrorCode } from './error-definitions.js';

export class ValidationError extends AppException {
  constructor(messageKey: string, issues: ValidationIssue[]) {
    super({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey,
      details: { issues },
    });
  }
}
