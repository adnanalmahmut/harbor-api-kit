// BetterAuth-bound adapter operations for the session concern
// (sign-out, getSession, listSessions, revoke*, OAuth node passthrough).
// Infrastructure only — these are NOT application services or use cases.
// Use cases live under `src/modules/auth/application/use-cases/` and
// depend on `AuthProviderPort`, which the facade in this directory implements.
import type { RequestContext } from '#src/core/index.js';
import { AuthCacheKeys, AuthException } from '../../application/index.js';
import type {
  AuthResult,
  GetSessionCommand,
  GetSessionResult,
  Session,
  SignOutCommand,
} from '../../domain/index.js';
import type { BetterAuthDeps } from './better-auth.deps.js';
import {
  readCookiesFromHeaders,
  rethrowAsAppException,
  toHeadersFromContext,
  type FastifyLikeReply,
  type FastifyLikeRequest,
} from './better-auth.helpers.js';
import { hydrateSession, hydrateUser } from './better-auth.hydrators.js';
import { invalidateUserSessions } from './better-auth.session-cache.js';

export type BetterAuthNodeHandler = (
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
) => Promise<void>;

export function createSessionOps(
  deps: BetterAuthDeps,
  nodeHandler: BetterAuthNodeHandler,
) {
  const { auth, prisma, config, redisService, logger } = deps;

  return {
    async handleRequest(req: unknown, res: unknown): Promise<void> {
      const fastifyReq = req as FastifyLikeRequest;
      const request = fastifyReq.raw;
      const fastifyRes = res as FastifyLikeReply;
      const response = fastifyRes.raw;

      let clientIp = fastifyReq.ip;

      if (config.app().env === 'test') {
        const testIp = fastifyReq.cookies?.['x-test-ip'];
        if (testIp) {
          clientIp = testIp;
        }
      }

      if (clientIp && !request.headers['x-forwarded-for']) {
        request.headers['x-forwarded-for'] = clientIp;
      }

      await nodeHandler(request, response);
    },

    async signOut(cmd: SignOutCommand): Promise<AuthResult<void>> {
      try {
        const { headers } = await auth.api.signOut({
          returnHeaders: true,
          headers: toHeadersFromContext(cmd.context),
        });

        if (cmd.context.userId) {
          await invalidateUserSessions(
            cmd.context.userId,
            redisService,
            logger,
          );
        }

        if (cmd.context.sessionToken) {
          const sessionKey = redisService.key(
            AuthCacheKeys.session(cmd.context.sessionToken),
          );
          await redisService.raw().del(sessionKey);
        }

        return { data: undefined, cookies: readCookiesFromHeaders(headers) };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async getSession(
      cmd: GetSessionCommand,
    ): Promise<AuthResult<GetSessionResult>> {
      try {
        const headers = new Headers(toHeadersFromContext(cmd.context));

        const { headers: responseHeaders, response } =
          await auth.api.getSession({
            headers,
            returnHeaders: true,
          });

        const cookies = readCookiesFromHeaders(responseHeaders);

        if (response) {
          const u = response.user;
          const s = response.session;
          if (
            (u as Record<string, unknown>)?.deletedAt ||
            (s as Record<string, unknown>)?.deletedAt
          ) {
            return { data: null, cookies };
          }

          return {
            data: {
              user: hydrateUser(u),
              session: hydrateSession(s),
            },
            cookies,
          };
        }

        return { data: null, cookies };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async listSessions(
      context: RequestContext,
    ): Promise<AuthResult<Session[]>> {
      try {
        const headers = toHeadersFromContext(context);
        const res = await auth.api.listSessions({
          headers,
        });

        return {
          data: res.map((s) => hydrateSession(s)),
          cookies: [],
        };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async revokeSession(
      sessionId: string,
      context: RequestContext,
    ): Promise<AuthResult<void>> {
      try {
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          throw AuthException.sessionNotFound();
        }

        await auth.api.revokeSession({
          body: { token: session.token },
          headers: toHeadersFromContext(context),
        });

        await invalidateUserSessions(session.userId, redisService, logger);

        const sessionKey = redisService.key(
          AuthCacheKeys.session(session.token),
        );
        await redisService.raw().del(sessionKey);

        return { data: undefined, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async revokeSessions(
      sessionIds: string[],
      context: RequestContext,
    ): Promise<AuthResult<void>> {
      try {
        const sessions = await prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: { userId: true, token: true, id: true },
        });

        if (sessions.length === 0) {
          throw AuthException.sessionNotFound();
        }

        const headers = toHeadersFromContext(context);
        await Promise.all(
          sessions.map((s) =>
            auth.api.revokeSession({
              body: { token: s.token },
              headers,
            }),
          ),
        );

        const uniqueUserIds = [...new Set(sessions.map((s) => s.userId))];
        await Promise.all(
          uniqueUserIds.map((uid) =>
            invalidateUserSessions(uid, redisService, logger),
          ),
        );

        const keysToDelete = sessions.map((s) =>
          redisService.key(AuthCacheKeys.session(s.token)),
        );
        if (keysToDelete.length > 0) {
          await redisService.raw().del(...keysToDelete);
        }

        return { data: undefined, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async revokeOtherSessions(
      context: RequestContext,
    ): Promise<AuthResult<void>> {
      try {
        await auth.api.revokeOtherSessions({
          headers: toHeadersFromContext(context),
        });

        if (context.userId) {
          await invalidateUserSessions(context.userId, redisService, logger);
        }

        return { data: undefined, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },
  };
}
