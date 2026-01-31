import { setRequestContext } from '#src/infrastructure/context/request-context.manager.js';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class RequestIdentityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    const userId = req.user?.id ?? req.userId;
    const sessionId = req.session?.id ?? req.sessionId;

    const i18n = I18nContext.current();
    const locale = i18n?.lang;

    setRequestContext({
      locale,
      userId: userId ? String(userId) : undefined,
      sessionId: sessionId ? String(sessionId) : undefined,
      // tenantId: req.tenantId ?? req.user?.tenantId ?? ...
    });

    return next.handle();
  }
}
