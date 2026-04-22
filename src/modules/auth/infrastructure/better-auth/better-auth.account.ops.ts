// BetterAuth-bound adapter operations for the account concern
// (verifyEmail, changeEmail, requestVerificationEmail, updateUser,
// deleteUser, reactivateUser). Infrastructure only — these are NOT
// application services or use cases. Use cases live under
// `src/modules/auth/application/use-cases/` and depend on
// `AuthProviderPort`, which the facade in this directory implements.
import type { RequestContext } from '#src/core/index.js';
import { AuthException } from '../../application/index.js';
import type {
  AuthResult,
  ChangeEmailCommand,
  TokenResult,
  User,
  VerifyEmailCommand,
} from '../../domain/index.js';
import type { BetterAuthDeps } from './better-auth.deps.js';
import {
  readCookiesFromHeaders,
  rethrowAsAppException,
  toHeadersFromContext,
} from './better-auth.helpers.js';
import { hydrateUser } from './better-auth.hydrators.js';
import { invalidateUserSessions } from './better-auth.session-cache.js';

export function createAccountOps(deps: BetterAuthDeps) {
  const { auth, prisma, redisService, logger } = deps;

  return {
    async verifyEmail(cmd: VerifyEmailCommand): Promise<AuthResult<void>> {
      try {
        const res = await auth.api.verifyEmail({
          query: { token: cmd.token },
          headers: toHeadersFromContext(cmd.context),
          returnHeaders: true,
        });
        return {
          data: undefined,
          cookies: readCookiesFromHeaders(res.headers),
        };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async changeEmail(
      cmd: ChangeEmailCommand,
    ): Promise<AuthResult<TokenResult>> {
      try {
        const res = await auth.api.changeEmail({
          body: { newEmail: cmd.newEmail, callbackURL: cmd.callbackURL },
          headers: toHeadersFromContext(cmd.context),
          returnHeaders: true,
        });

        return {
          data: {
            token:
              ((res.response as Record<string, unknown>)?.token as string) ||
              '',
          },
          cookies: readCookiesFromHeaders(res.headers),
        };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async requestVerificationEmail(
      email: string,
      context: RequestContext,
    ): Promise<AuthResult<void>> {
      try {
        await auth.api.sendVerificationEmail({
          body: { email },
          headers: toHeadersFromContext(context),
        });
        return { data: undefined, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async updateUser(
      input: Partial<User>,
      context: RequestContext,
    ): Promise<AuthResult<User>> {
      try {
        // better-auth expects roles/permissions as string (per additionalFields type)
        const body = {
          ...input,
          ...(Array.isArray((input as any).roles)
            ? { roles: JSON.stringify((input as any).roles) }
            : {}),
          ...(Array.isArray((input as any).permissions)
            ? { permissions: JSON.stringify((input as any).permissions) }
            : {}),
        };

        const res = await auth.api.updateUser({
          body: body as any,
          headers: toHeadersFromContext(context),
        });

        const userId = context.userId;
        if (userId) {
          await invalidateUserSessions(userId, redisService, logger);
        }

        return {
          data: { ...hydrateUser(res), status: true } as User & {
            status: boolean;
          },
          cookies: [],
        };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async deleteUser(context: RequestContext): Promise<AuthResult<void>> {
      try {
        await auth.api.deleteUser({
          headers: toHeadersFromContext(context),
          body: {},
        });

        if (context.userId) {
          await invalidateUserSessions(context.userId, redisService, logger);
        }

        return { data: undefined, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async reactivateUser(email: string): Promise<AuthResult<void>> {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw AuthException.userNotFound();
        }

        if (!user.deletedAt) {
          return { data: undefined, cookies: [] };
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { deletedAt: null },
        });

        await prisma.account.updateMany({
          where: { userId: user.id, deletedAt: { not: null } },
          data: { deletedAt: null },
        });

        return { data: undefined, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },
  };
}
