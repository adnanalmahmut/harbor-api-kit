import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { CacheTTL } from '#src/infrastructure/redis/redis.keys.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { AuthCacheKeys } from '#src/modules/auth/application/cache/auth-cache.keys.js';
import type { AuthProviderPort } from '#src/modules/auth/application/ports/auth-provider.port.js';
import type { RequestContextStorePort } from '#src/modules/auth/application/ports/request-context.store.port.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import { AuthException } from '#src/modules/auth/domain/exceptions/auth.exception.js';
import {
  type CanActivate,
  type ExecutionContext, // ...
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(AUTH_TOKENS.AUTH_PROVIDER)
    private readonly authProvider: AuthProviderPort,
    @Inject(AUTH_TOKENS.REQUEST_CONTEXT_STORE)
    private readonly contextStore: RequestContextStorePort,
    private readonly config: AppConfigService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();

    const ctx = this.contextStore.get();
    if (!ctx) throw AuthException.authenticationRequired();

    this.contextStore.set({
      headers: req.headers,
      query: req.query as Record<string, string | string[] | undefined>,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const token = this.extractToken(req);
    // If we have a token, we can use it as a cache key.
    // If no token, we can't cache reliably (or we let the provider fail).
    const cacheKey = token
      ? AuthCacheKeys.session(token)
      : 'auth_session_generic';
    const scope = token ? 'both' : 'request';

    const sessionResult = await this.contextStore.getOrLoad(
      cacheKey,
      () =>
        this.authProvider.getSession({
          context: this.contextStore.get()!,
        }),
      CacheTTL.ONE_WEEK, // Cache for 1 week (L2)
      scope,
    );

    if (!sessionResult?.session) throw AuthException.authenticationRequired();

    this.contextStore.set({
      userId: sessionResult.user.id,
      sessionId: sessionResult.session.id,
      sessionToken: token || undefined,
      user: sessionResult.user,
      session: sessionResult.session,
    });

    // Track session key for invalidation using injected RedisService
    if (token && sessionResult.user.id) {
      const userId = sessionResult.user.id;
      const userSessionsKey = this.redisService.key(
        AuthCacheKeys.userSessions(userId),
      );
      const prefixedCacheKey = this.redisService.key(cacheKey);

      this.logger.debug(
        `Tracking session key: ${prefixedCacheKey} in set: ${userSessionsKey}`,
      );

      this.redisService
        .raw()
        .sadd(userSessionsKey, prefixedCacheKey)
        .catch((err) => {
          this.logger.error('Failed to track session key', err);
        });
      this.redisService
        .raw()
        .expire(userSessionsKey, 60 * 60 * 24 * 7)
        .catch(() => {});
    }

    req.user = sessionResult.user;
    req.session = sessionResult.session;

    return true;
  }

  private extractToken(req: FastifyRequest): string | null {
    // 1. Bearer Token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Cookie
    const cookieName = this.config.auth().sessionTokenCookie;
    if (req.cookies && req.cookies[cookieName]) {
      return req.cookies[cookieName];
    }

    return null;
  }
}
