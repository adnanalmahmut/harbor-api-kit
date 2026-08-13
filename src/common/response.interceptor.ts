import { translateIfKey } from '#src/infrastructure/i18n/i18n.utils.js';
import {
  Injectable,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Observable, mergeMap } from 'rxjs';
import { getRequestContext, setRequestContext } from './request-context.js';

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
 * Wraps handler results in `{ success, message, data }`.
 *
 * It also copies the identity resolved by the auth guard and the locale
 * resolved by nestjs-i18n into the request context, which used to be a second
 * global interceptor. The two had to run in this order anyway — the envelope
 * reads the locale the other one writes — so a second registration only made
 * that dependency easier to break.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  T | ApiSuccess<T>
> {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService<Record<string, any>>,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | ApiSuccess<T>> {
    this.captureIdentity(context);

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const messageKey = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const locale = getRequestContext()?.locale;

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

  private captureIdentity(context: ExecutionContext): void {
    const req = context.switchToHttp().getRequest();

    const userId = req.user?.id ?? req.userId;
    const sessionId = req.session?.id ?? req.sessionId;

    setRequestContext({
      locale: I18nContext.current()?.lang,
      userId: userId ? String(userId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
    });
  }

  /** `deletedAt` is an implementation detail of soft deletes, never a response field. */
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
