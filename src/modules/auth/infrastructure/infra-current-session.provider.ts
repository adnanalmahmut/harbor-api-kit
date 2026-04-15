import { CORE_TOKENS, type RequestContextStorePort } from '#src/core/index.js';
import {
  Session,
  User,
  type CurrentSessionProviderPort,
  type SessionContext,
} from '#src/modules/auth/domain/index.js';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class InfraCurrentSessionProvider implements CurrentSessionProviderPort {
  constructor(
    @Inject(CORE_TOKENS.REQUEST_CONTEXT_STORE)
    private readonly contextStore: RequestContextStorePort,
  ) {}

  get(): Promise<SessionContext | null> {
    const ctx = this.contextStore.get();
    if (!ctx || !ctx.userId) return Promise.resolve(null);

    const rawUser = ctx.user as any;
    const rawSession = ctx.session as any;

    const user = rawUser
      ? new User(
          rawUser.id,
          rawUser.email,
          rawUser.emailVerified,
          rawUser.name,
          rawUser.firstName,
          rawUser.lastName,
          rawUser.image ?? '',
          rawUser.locale,
          rawUser.createdAt,
          rawUser.updatedAt,
        )
      : undefined;

    const session = rawSession
      ? new Session(
          rawSession.id,
          rawSession.userId,
          rawSession.expiresAt,
          rawSession.ipAddress,
          rawSession.userAgent,
          rawSession.city,
          rawSession.country,
          rawSession.createdAt,
          rawSession.updatedAt,
          rawSession.token,
        )
      : undefined;

    return Promise.resolve({
      userId: ctx.userId,
      sessionId: ctx.sessionId || 'unknown',
      tenantId: ctx.tenantId,
      headers: ctx.headers,
      user,
      session,
    });
  }
}
