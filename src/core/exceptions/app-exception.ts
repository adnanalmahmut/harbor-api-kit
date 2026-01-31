import {
  AppErrorCode,
  ERROR_DEFINITIONS,
} from '#src/core/exceptions/error-definitions.js';

export class AppException extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly messageKey: string;
  public readonly details?: unknown;

  constructor(args: {
    code: AppErrorCode;
    details?: unknown;
    messageKey?: string;
    cause?: unknown;
  }) {
    const definition = ERROR_DEFINITIONS[args.code];

    super(args.messageKey ?? definition.messageKey, { cause: args.cause });

    this.code = args.code;
    this.status = definition.status;
    this.messageKey = args.messageKey ?? definition.messageKey;
    this.details = args.details;
  }
  static notAllowedByCORS() {
    return new AppException({
      code: AppErrorCode.NOT_ALLOWED_BY_CORS,
      messageKey: 'core.errors.not_allowed_by_cors',
    });
  }

  static validationError(details?: unknown) {
    return new AppException({
      code: AppErrorCode.VALIDATION_ERROR,
      details,
      messageKey: 'core.errors.validation_error',
    });
  }
}
