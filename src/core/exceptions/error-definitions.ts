export enum AppErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_JSON = 'INVALID_JSON',
  NOT_ALLOWED_BY_CORS = 'NOT_ALLOWED_BY_CORS',
}

export type ErrorDefinition = {
  status: number;
  messageKey: string;
};

export const ERROR_DEFINITIONS: Record<AppErrorCode, ErrorDefinition> = {
  [AppErrorCode.INTERNAL_ERROR]: {
    status: 500,
    messageKey: 'errors.common.internal',
  },
  [AppErrorCode.BAD_REQUEST]: {
    status: 400,
    messageKey: 'errors.common.bad_request',
  },
  [AppErrorCode.NOT_FOUND]: {
    status: 404,
    messageKey: 'errors.common.not_found',
  },
  [AppErrorCode.FORBIDDEN]: {
    status: 403,
    messageKey: 'errors.auth.forbidden',
  },
  [AppErrorCode.UNAUTHORIZED]: {
    status: 401,
    messageKey: 'errors.auth.unauthorized',
  },
  [AppErrorCode.VALIDATION_ERROR]: {
    status: 400,
    messageKey: 'errors.common.validation',
  },
  [AppErrorCode.CONFLICT]: {
    status: 409,
    messageKey: 'errors.common.conflict',
  },
  [AppErrorCode.INVALID_JSON]: {
    status: 400,
    messageKey: 'errors.common.invalid_json',
  },
  [AppErrorCode.NOT_ALLOWED_BY_CORS]: {
    status: 403,
    messageKey: 'errors.common.not_allowed_by_cors',
  },
};
