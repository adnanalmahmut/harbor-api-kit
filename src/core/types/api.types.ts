export type ApiSuccess<T = unknown> = {
  message?: string;
  data?: T;
};

export type ApiErrorBody = {
  message: string;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ApiValidationErrorBody = {
  message: string;
  errors: ValidationIssue[];
};

export type ApiErrorResponse = ApiErrorBody | ApiValidationErrorBody;
