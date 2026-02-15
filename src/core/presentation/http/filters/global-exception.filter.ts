import { CORE_TOKENS } from '#src/core/core.tokens.js';
import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import {
  AppErrorCode,
  ERROR_DEFINITIONS,
} from '#src/core/domain/exceptions/error-definitions.js';
import { ValidationError } from '#src/core/domain/exceptions/validation.exception.js';
import type { RequestContextStorePort } from '#src/core/domain/ports/request-context.store.port.js';
import type { ValidationIssue } from '#src/core/domain/types/validation-issue.type.js';
import { stripQuery } from '#src/core/domain/utils/shared.utils.js';
import type { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import type { ApiErrorResponse } from '#src/core/presentation/http/types/api.types.js';
import {
  isI18nKeyLike,
  mapValidationIssuesToApi,
  translateIfKey,
} from '#src/core/presentation/http/utils/i18n.utils.js';
import { isMalformedJsonError } from '#src/core/presentation/http/utils/json-error.utils.js';
import {
  Catch,
  HttpException,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Logger } from 'nestjs-pino';

function codeByStatus(status: number): AppErrorCode {
  const found = (
    Object.entries(ERROR_DEFINITIONS) as [AppErrorCode, { status: number }][]
  ).find(([, def]) => def.status === status);
  return found?.[0] ?? AppErrorCode.INTERNAL_ERROR;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly i18n: I18nService,
    private readonly config: AppConfigService,
    @Inject(CORE_TOKENS.REQUEST_CONTEXT_STORE)
    private readonly contextStore: RequestContextStorePort,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<FastifyReply>();
    const req = http.getRequest<FastifyRequest>();

    const context = this.contextStore.get();
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

    const requestIdHeader = this.config.requestId().headerName;
    const requestId =
      context?.requestId ??
      (req.headers[requestIdHeader] as string | undefined) ??
      'unknown';

    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-csrf-token',
      'x-api-key',
      'proxy-authorization',
    ];

    const safeHeaders = { ...req.headers };
    sensitiveHeaders.forEach((h) => {
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
