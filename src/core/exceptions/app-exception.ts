import { AppErrorCode, ERROR_DEFINITIONS } from './error-definitions.js';

export class AppException extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly messageKey: string;
  public readonly details?: unknown;

  constructor(args: {
    code: AppErrorCode;
    details?: unknown;
    messageKey?: string;
  }) {
    const definition = ERROR_DEFINITIONS[args.code];

    super(args.messageKey ?? definition.messageKey);

    this.code = args.code;
    this.status = definition.status;
    this.messageKey = args.messageKey ?? definition.messageKey;
    this.details = args.details;
  }

  static unauthorized() {
    return new AppException({ code: AppErrorCode.UNAUTHORIZED });
  }

  static forbidden() {
    return new AppException({ code: AppErrorCode.FORBIDDEN });
  }

  static notFound() {
    return new AppException({ code: AppErrorCode.NOT_FOUND });
  }

  static conflict() {
    return new AppException({ code: AppErrorCode.CONFLICT });
  }

  static badRequest() {
    return new AppException({ code: AppErrorCode.BAD_REQUEST });
  }

  static internalError() {
    return new AppException({ code: AppErrorCode.INTERNAL_ERROR });
  }

  static validationError(details?: unknown) {
    return new AppException({ code: AppErrorCode.VALIDATION_ERROR, details });
  }

  static notAllowedByCORS() {
    return new AppException({ code: AppErrorCode.NOT_ALLOWED_BY_CORS });
  }
}
