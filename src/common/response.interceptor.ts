import { translateIfKey } from '#src/infrastructure/i18n/i18n.utils.js';
import {
  Inject,
  Injectable,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Observable, mergeMap } from 'rxjs';
import { RequestContextStorePort } from './request-context.js';

export type ApiSuccess<T = unknown> = {
  success: true;
  message?: string;
  data?: T;
};

export const RESPONSE_MESSAGE_KEY = 'response:message';
export const SKIP_ENVELOPE_KEY = 'response:skip-envelope';

/** Sets the i18n key the envelope's `message` is translated from. */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);

/** Returns the handler's value verbatim, outside the `{ success, data }` envelope. */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);

/**
 * Copies the identity resolved by the auth guard and the i18n resolver into the
 * request context, so the logger, the envelope and the exception filter all
 * report the same user and locale.
 */
@Injectable()
export class RequestIdentityInterceptor implements NestInterceptor {
  constructor(
    @Inject(RequestContextStorePort)
    private readonly contextStore: RequestContextStorePort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    const userId = req.user?.id ?? req.userId;
    const sessionId = req.session?.id ?? req.sessionId;

    const i18n = I18nContext.current();
    const locale = i18n?.lang;

    this.contextStore.set({
      locale,
      userId: userId ? String(userId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
    });

    return next.handle();
  }
}

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
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const messageKey = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
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
