import type { ApiValidationErrorBody } from '#src/core/domain/types/validation-issue.type.js';

export type ApiSuccess<T = unknown> = {
  success: true;
  message?: string;
  data?: T;
};

export type ApiErrorBody = {
  success: false;
  message: string;
};

export type ApiErrorResponse = ApiErrorBody | ApiValidationErrorBody;
