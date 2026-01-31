import { AppException } from '#src/core/exceptions/app-exception.js';
import {
  AppErrorCode,
  ERROR_DEFINITIONS,
} from '#src/core/exceptions/error-definitions.js';
import { ValidationError } from '#src/core/exceptions/validation.exception.js';
import type {
  ApiErrorResponse,
  ValidationIssue,
} from '#src/core/types/api.types.js';
import type { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { getRequestContext } from '#src/infrastructure/context/request-context.manager.js';
import { isMalformedJsonError } from '#src/infrastructure/validation/json-error.util.js';
import {
  mapValidationIssuesToApi,
  translateIfKey,
} from '#src/infrastructure/validation/validation.utils.js';
import {
  Catch,
  HttpException,
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
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<FastifyReply>();
    const req = http.getRequest<FastifyRequest>();

    const context = getRequestContext();
    // Fallback to I18nContext if RequestContext doesn't have locale (e.g. before auth/context middleware populated it)
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
      const code = codeByStatus(status);
      messageKey =
        ERROR_DEFINITIONS[code]?.messageKey ??
        ERROR_DEFINITIONS[AppErrorCode.INTERNAL_ERROR].messageKey;
    }

    const requestIdHeader = this.config.requestId().headerName;
    const requestId =
      context?.requestId ??
      (req.headers[requestIdHeader] as string | undefined) ??
      'unknown';

    const logData = {
      ...context,
      requestId,
      statusCode: status,
      err:
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
              stack: exception.stack,
            }
          : exception,
    };

    if (status >= 500) this.logger.error(logData, messageKey);
    else this.logger.warn(logData, messageKey);

    const message = await translateIfKey(this.i18n, messageKey, locale);

    if (errors?.length) {
      const apiErrors = await mapValidationIssuesToApi(errors, (v) =>
        translateIfKey(this.i18n, v, locale),
      );
      const body: ApiErrorResponse = { message, errors: apiErrors };
      return res.status(status).send(body);
    }

    const body: ApiErrorResponse = { message };
    return res.status(status).send(body);
  }
}
