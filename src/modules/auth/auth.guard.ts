import {
  getRequestContext,
  setRequestContext,
} from '#src/common/request-context.js';
import { CachePort, getOrLoad } from '#src/infrastructure/cache/cache.port.js';
import { authCacheKeys } from './auth.cache-keys.js';
import {
  applyCookies,
  readCookiesFromHeaders,
  type CookieDirective,
} from './auth.cookies.js';
import { hydrateSession, hydrateUser } from './auth.entities.js';
import { AuthException } from './auth.exception.js';
import { AuthConfigPort, SessionTrackerPort } from './auth.ports.js';
import { BETTER_AUTH, type BetterAuthInstance } from './better-auth.js';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(BETTER_AUTH)
    private readonly auth: BetterAuthInstance,
    private readonly cache: CachePort,
    private readonly config: AuthConfigPort,
    private readonly sessionTracker: SessionTrackerPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    const ctx = getRequestContext();
    if (!ctx) throw AuthException.authenticationRequired();

    setRequestContext({
      headers: req.headers,
      query: req.query as Record<string, string | string[] | undefined>,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const token = this.extractToken(req);
    // If we have a token, we can use it as a cache key.
    // If no token, we can't cache reliably (or we let the provider fail).
    const cacheKey = token
      ? authCacheKeys.session(token)
      : 'auth_session_generic';
    const scope = token ? 'both' : 'request';
    let refreshedCookies: CookieDirective[] | undefined;

    const sessionResult = await getOrLoad(
      this.cache,
      cacheKey,
      async () => {
        const { headers, response } = await this.auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
          returnHeaders: true,
        });
        refreshedCookies = readCookiesFromHeaders(headers);
        if (!response) return null;
        return {
          user: hydrateUser(response.user),
          session: hydrateSession(response.session),
        };
      },
      this.config.sessionLookupCacheTtlSec,
      scope,
    );

    applyCookies(reply, refreshedCookies);

    if (!sessionResult?.session) throw AuthException.authenticationRequired();

    setRequestContext({
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
