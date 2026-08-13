import { RequestContextStorePort } from '#src/common/context/request-context.store.js';
import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { Observable, mergeMap } from 'rxjs';
import { CONSTANTS_KEYS } from '../constants/metadata-keys.constants.js';
import type { ApiSuccess } from '../types/api.types.js';
import { translateIfKey } from '#src/infrastructure/i18n/i18n.utils.js';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  T | ApiSuccess<T>
> {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService<Record<string, any>>,
    @Inject(RequestContextStorePort)
    private readonly contextStore: RequestContextStorePort,
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

    const store = this.contextStore.get();
    const locale = store?.locale;

    return next.handle().pipe(
      mergeMap(async (data: any) => {
        const message = messageKey
          ? await translateIfKey(this.i18n, messageKey, locale)
          : undefined;

        const result: ApiSuccess<T> = { success: true };

        if (message) result.message = message;

        let finalData = data;
        if (data !== null && data !== undefined) {
          finalData = this.pruneFields(data);
        }

        if (finalData !== null && finalData !== undefined) {
          result.data = finalData;
        }

        return result;
      }),
    );
  }

  private pruneFields(data: any): any {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.pruneFields(item));
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
      const pruned: any = {};
      for (const key in data) {
        if (key === 'deletedAt') continue;
        pruned[key] = this.pruneFields(data[key]);
      }
      return pruned;
    }

    return data;
  }
}
