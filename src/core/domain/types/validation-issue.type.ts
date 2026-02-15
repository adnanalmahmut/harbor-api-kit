export type ValidationIssue = {
  path: string;
  message: string;
};

export type ApiValidationErrorBody = {
  success: false;
  message: string;
  errors: ValidationIssue[];
};
