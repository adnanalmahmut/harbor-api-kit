import {
  getRequestContext,
  setRequestContext,
} from '#src/common/request-context.js';
import { authConfig } from '#src/config/index.js';
import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { applyCookies, readCookiesFromHeaders } from './auth.cookies.js';
import { hydrateSession, hydrateUser } from './auth.entities.js';
import { AuthException } from './auth.exception.js';
import { BETTER_AUTH, type BetterAuthInstance } from './better-auth.js';

/**
 * Resolves the session for a guarded route.
 *
 * The lookup is not cached here. Better Auth reads the session from Redis
 * itself now that it is configured with secondary storage, so a cache in front
 * of `getSession` would only be a second copy of the same Redis value — with a
 * second TTL to keep in step and no way to invalidate it when Better Auth
 * revokes the underlying session.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(BETTER_AUTH)
    private readonly auth: BetterAuthInstance,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
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

    const { headers, response } = await this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      returnHeaders: true,
    });

    // A rolling session hands back a refreshed cookie; it has to reach the
    // client on this response or the refresh is lost.
    applyCookies(reply, readCookiesFromHeaders(headers));

    if (!response?.session) throw AuthException.authenticationRequired();

    const user = hydrateUser(response.user);
    const session = hydrateSession(response.session);

    setRequestContext({
      userId: user.id,
      sessionId: session.id,
      sessionToken: this.extractToken(req) || undefined,
      user,
      session,
    });

    req.user = user;
    req.session = session;

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
