import { CORE_TOKENS, type RequestContextStorePort } from '#src/core/index.js';
import {
  AuthCacheKeys,
  AuthException,
} from '#src/modules/auth/application/index.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import type {
  AuthConfigPort,
  AuthProviderPort,
  CookieDirective,
  SessionTrackerPort,
} from '#src/modules/auth/domain/index.js';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { applyCookies } from './auth.http.js';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(AUTH_TOKENS.AUTH_PROVIDER)
    private readonly authProvider: AuthProviderPort,
    @Inject(CORE_TOKENS.REQUEST_CONTEXT_STORE)
    private readonly contextStore: RequestContextStorePort,
    @Inject(AUTH_TOKENS.AUTH_CONFIG)
    private readonly config: AuthConfigPort,
    @Inject(AUTH_TOKENS.SESSION_TRACKER)
    private readonly sessionTracker: SessionTrackerPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

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
    let refreshedCookies: CookieDirective[] | undefined;

    const sessionResult = await this.contextStore.getOrLoad(
      cacheKey,
      async () => {
        const result = await this.authProvider.getSession({
          context: this.contextStore.get()!,
        });
        refreshedCookies = result.cookies;
        return result.data;
      },
      this.config.sessionLookupCacheTtlSec,
      scope,
    );

    applyCookies(reply, refreshedCookies);

    if (!sessionResult?.session) throw AuthException.authenticationRequired();

    // Check if user is still allowed to login (not deleted/suspended)
    // NOTE: When coming from cache, the user object might be a plain object,
    // so we cannot rely on class getters like .canLogin or .isActive.
    const isDeleted = !!sessionResult.user.deletedAt;
    const canLogin = !isDeleted;

    if (!canLogin) {
      throw AuthException.authenticationRequired();
    }

    this.contextStore.set({
      userId: sessionResult.user.id,
      sessionId: sessionResult.session.id,
      sessionToken: token || undefined,
      user: sessionResult.user,
      session: sessionResult.session,
    });

    // Track session key for invalidation (fire-and-forget, must not block auth)
    if (token && sessionResult.user.id) {
      this.sessionTracker
        .trackSession(sessionResult.user.id, cacheKey)
        .catch((err) => {
          this.logger.warn(
            `Failed to track session for user ${sessionResult.user.id}: ${err?.message ?? err}`,
          );
        });
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
    const cookieName = this.config.sessionTokenCookie;
    if (req.cookies && req.cookies[cookieName]) {
      return req.cookies[cookieName];
    }

    return null;
  }
}
