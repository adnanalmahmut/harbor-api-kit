import { CONSTANTS_KEYS } from '#src/core/http/metadata-keys.constants.js';
import type { ApiSuccess } from '#src/core/types/api.types.js';
import { getRequestContext } from '#src/infrastructure/context/request-context.manager.js';
import { translateIfKey } from '#src/infrastructure/validation/validation.utils.js';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { Observable, mergeMap } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, T | ApiSuccess<T>>
{
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService<Record<string, any>>,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | ApiSuccess<T>> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      CONSTANTS_KEYS.SKIP_ENVELOPE,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return next.handle();

    const messageKey = this.reflector.getAllAndOverride<string>(
      CONSTANTS_KEYS.RESPONSE_MESSAGE,
      [context.getHandler(), context.getClass()],
    );

    const store = getRequestContext();
    const locale = store?.locale;

    return next.handle().pipe(
      mergeMap(async (data: T | null | undefined) => {
        const message = messageKey
          ? await translateIfKey(this.i18n, messageKey, locale)
          : undefined;

        const result: ApiSuccess<T> = { success: true };

        if (message) result.message = message;

        if (data !== null && data !== undefined) {
          result.data = data;
        }

        return result;
      }),
    );
  }
}
