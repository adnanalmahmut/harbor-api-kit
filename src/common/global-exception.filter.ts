import { httpConfig } from '#src/config/index.js';
import {
  mapValidationIssuesToApi,
  translateIfKey,
} from '#src/infrastructure/i18n/i18n.utils.js';
import {
  Catch,
  HttpException,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Logger } from 'nestjs-pino';
import {
  AppErrorCode,
  AppException,
  ERROR_DEFINITIONS,
  ValidationError,
  type ValidationIssue,
} from './app-exception.js';
import { getRequestContext } from './request-context.js';
import { isI18nKeyLike, stripQuery } from './utils.js';

export type ApiErrorBody = {
  success: false;
  message: string;
};

export type ApiValidationErrorBody = ApiErrorBody & {
  errors: ValidationIssue[];
};

export type ApiErrorResponse = ApiErrorBody | ApiValidationErrorBody;

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
  'x-api-key',
  'proxy-authorization',
];

function codeByStatus(status: number): AppErrorCode {
  const found = (
    Object.entries(ERROR_DEFINITIONS) as [AppErrorCode, { status: number }][]
  ).find(([, def]) => def.status === status);
  return found?.[0] ?? AppErrorCode.INTERNAL_ERROR;
}

function normalizeMessage(msg: unknown): string {
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.map(normalizeMessage).join(' ');
  if (msg && typeof msg === 'object' && 'message' in (msg as any)) {
    return normalizeMessage((msg as any).message);
  }
  return '';
}

/**
 * Fastify rejects a malformed body before Nest ever sees a route, and the error
 * it throws carries no code — only a message. Sniffing it here is what turns
 * that into a 400 `INVALID_JSON` instead of a 500.
 */
export function isMalformedJsonError(exception: unknown): boolean {
  if (exception instanceof SyntaxError && 'body' in (exception as any)) {
    return true;
  }

  if (
    exception &&
    typeof exception === 'object' &&
    'getResponse' in exception &&
    typeof (exception as any).getResponse === 'function'
  ) {
    const response = (exception as any).getResponse();
    const message = (exception as any).message;

    const combined =
      `${normalizeMessage(response)} ${message ?? ''}`.toLowerCase();

    const jsonErrorPatterns = [
      'body is not valid json',
      'invalid json',
      'unexpected token',
      'json parse',
      'malformed json',
    ];

    return jsonErrorPatterns.some((pattern) => combined.includes(pattern));
  }

  return false;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly i18n: I18nService,
    @Inject(httpConfig.KEY)
    private readonly config: ConfigType<typeof httpConfig>,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<FastifyReply>();
    const req = http.getRequest<FastifyRequest>();

    const context = getRequestContext();
    const locale = context?.locale ?? I18nContext.current()?.lang;

    let status = ERROR_DEFINITIONS[AppErrorCode.INTERNAL_ERROR].status;
    let messageKey = ERROR_DEFINITIONS[AppErrorCode.INTERNAL_ERROR].messageKey;
    let errors: ValidationIssue[] | undefined;

    if (isMalformedJsonError(exception)) {
      status = ERROR_DEFINITIONS[AppErrorCode.INVALID_JSON].status;
      messageKey = ERROR_DEFINITIONS[AppErrorCode.INVALID_JSON].messageKey;
    } else if (
      exception instanceof ValidationError ||
      exception instanceof AppException
    ) {
      status = exception.status;
      messageKey = exception.messageKey;

      if (exception instanceof ValidationError) {
        const details = exception.details as any;
        const issues = details?.issues as ValidationIssue[] | undefined;
        if (Array.isArray(issues)) errors = issues;
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse() as any;
      const responseMessage =
        typeof response === 'object' && response !== null
          ? response.message
          : response;

      const code = codeByStatus(status);
      const defaultKey =
        ERROR_DEFINITIONS[code]?.messageKey ??
        ERROR_DEFINITIONS[AppErrorCode.INTERNAL_ERROR].messageKey;

      messageKey =
        typeof responseMessage === 'string' && isI18nKeyLike(responseMessage)
          ? responseMessage
          : defaultKey;
    } else if (exception instanceof Error) {
      if (isI18nKeyLike(exception.message)) {
        messageKey = exception.message;
      }
    }

    const requestIdHeader = this.config.requestId.headerName;
    const requestId =
      context?.requestId ??
      (req.headers[requestIdHeader] as string | undefined) ??
      'unknown';

    const safeHeaders = { ...req.headers };
    SENSITIVE_HEADERS.forEach((h) => {
      if (safeHeaders[h]) safeHeaders[h] = '[REDACTED]';
    });

    const logData = {
      requestId,
      method: req.method,
      path: stripQuery(req.url),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: context?.userId,
      tenantId: context?.tenantId,
      statusCode: status,
      headers: safeHeaders,
      err:
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
              stack: status >= 500 ? exception.stack : undefined,
              code: (exception as any).code,
            }
          : exception,
    };

    if (status >= 500) {
      this.logger.error(logData, messageKey);
    } else {
      this.logger.warn(logData, messageKey);
    }

    const args = (exception as any)?.details || (exception as any)?.args;
    const message = await translateIfKey(this.i18n, messageKey, locale, args);

    if (errors?.length) {
      const apiErrors = await mapValidationIssuesToApi(errors, (v) =>
        translateIfKey(this.i18n, v, locale),
      );
      const body: ApiErrorResponse = {
        success: false,
        message,
        errors: apiErrors,
      };
      return res.status(status).send(body);
    }

    const body: ApiErrorResponse = { success: false, message };
    return res.status(status).send(body);
  }
}
