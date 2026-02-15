import { CORE_TOKENS } from '#src/core/core.tokens.js';
import type { RequestContextStorePort } from '#src/core/domain/ports/request-context.store.port.js';
import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class RequestIdentityInterceptor implements NestInterceptor {
  constructor(
    @Inject(CORE_TOKENS.REQUEST_CONTEXT_STORE)
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
