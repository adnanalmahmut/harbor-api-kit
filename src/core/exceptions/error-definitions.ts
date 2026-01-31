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
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}

export type ErrorDefinition = {
  status: number;
  messageKey: string;
};

export const ERROR_DEFINITIONS: Record<AppErrorCode, ErrorDefinition> = {
  [AppErrorCode.INTERNAL_ERROR]: {
    status: 500,
    messageKey: 'core.errors.common.internal',
  },
  [AppErrorCode.BAD_REQUEST]: {
    status: 400,
    messageKey: 'core.errors.common.bad_request',
  },
  [AppErrorCode.NOT_FOUND]: {
    status: 404,
    messageKey: 'core.errors.common.not_found',
  },
  [AppErrorCode.FORBIDDEN]: {
    status: 403,
    messageKey: 'core.errors.auth.forbidden',
  },
  [AppErrorCode.UNAUTHORIZED]: {
    status: 401,
    messageKey: 'core.errors.auth.unauthorized',
  },
  [AppErrorCode.VALIDATION_ERROR]: {
    status: 400,
    messageKey: 'core.errors.common.validation',
  },
  [AppErrorCode.CONFLICT]: {
    status: 409,
    messageKey: 'core.errors.common.conflict',
  },
  [AppErrorCode.INVALID_JSON]: {
    status: 400,
    messageKey: 'core.errors.common.invalid_json',
  },
  [AppErrorCode.NOT_ALLOWED_BY_CORS]: {
    status: 403,
    messageKey: 'core.errors.common.not_allowed_by_cors',
  },
  [AppErrorCode.TOO_MANY_REQUESTS]: {
    status: 429,
    messageKey: 'core.errors.common.too_many_requests',
  },
  [AppErrorCode.UNPROCESSABLE_ENTITY]: {
    status: 422,
    messageKey: 'core.errors.common.unprocessable_entity',
  },
  [AppErrorCode.INVALID_CREDENTIALS]: {
    status: 401,
    messageKey: 'core.errors.auth.invalid_credentials',
  },
};
