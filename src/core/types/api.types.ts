export type ApiSuccess<T = unknown> = {
  success: true;
  message?: string;
  data?: T;
};

export type ApiErrorBody = {
  success: false;
  message: string;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ApiValidationErrorBody = {
  success: false;
  message: string;
  errors: ValidationIssue[];
};

export type ApiErrorResponse = ApiErrorBody | ApiValidationErrorBody;
