import { getRequestContext } from '#src/infrastructure/context/request-context.manager.js';
import type {
  Session,
  User,
} from '#src/modules/auth/application/ports/auth-dtos.js';
import type {
  CurrentSessionProviderPort,
  SessionContext,
} from '#src/modules/auth/application/ports/current-session.provider.port.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InfraCurrentSessionProvider implements CurrentSessionProviderPort {
  get(): Promise<SessionContext | null> {
    const ctx = getRequestContext();
    if (!ctx || !ctx.userId) return Promise.resolve(null);

    return Promise.resolve({
      userId: ctx.userId,
      sessionId: ctx.sessionId || 'unknown',
      tenantId: ctx.tenantId,
      headers: ctx.headers,
      user: ctx.user as User | undefined,
      session: ctx.session as Session | undefined,
    });
  }
}
