// BetterAuth-bound adapter operations for the password concern
// (forget / reset / change / verify / validate-reset-token).
// Infrastructure only — these are NOT application services or use cases.
// Use cases live under `src/modules/auth/application/use-cases/` and
// depend on `AuthProviderPort`, which the facade in this directory implements.
import type { RequestContext } from '#src/core/index.js';
import { AuthException } from '../../application/index.js';
import type {
  AuthResult,
  ChangePasswordCommand,
  CookieDirective,
  ForgetPasswordCommand,
  ResetPasswordCommand,
} from '../../domain/index.js';
import { verifyPassword } from 'better-auth/crypto';
import type { BetterAuthDeps } from './better-auth.deps.js';
import {
  readCookiesFromHeaders,
  rethrowAsAppException,
  safeErrorFields,
  toHeadersFromContext,
} from './better-auth.helpers.js';

export function createPasswordOps(deps: BetterAuthDeps) {
  const { auth, prisma, logger } = deps;

  return {
    async forgetPassword(
      cmd: ForgetPasswordCommand,
    ): Promise<AuthResult<void>> {
      try {
        const { email, context } = cmd;

        await auth.api.requestPasswordReset({
          body: { email },
          headers: toHeadersFromContext(context),
        });

        const cookies: CookieDirective[] = [];

        return { data: undefined, cookies };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async resetPassword(cmd: ResetPasswordCommand): Promise<AuthResult<void>> {
      try {
        const res = await auth.api.resetPassword({
          body: { newPassword: cmd.newPassword, token: cmd.token },
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

    async changePassword(
      cmd: ChangePasswordCommand,
    ): Promise<AuthResult<void>> {
      try {
        const res = await auth.api.changePassword({
          body: {
            currentPassword: cmd.currentPassword,
            newPassword: cmd.newPassword,
            revokeOtherSessions: cmd.revokeOtherSessions,
          },
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

    async checkPassword(
      password: string,
      context: RequestContext,
    ): Promise<AuthResult<boolean>> {
      try {
        if (!context.userId) {
          throw AuthException.authenticationRequired();
        }

        const account = await prisma.account.findFirst({
          where: {
            userId: context.userId,
            providerId: 'credential',
          },
          select: { password: true },
        });

        if (!account?.password) return { data: false, cookies: [] };

        const isValid = await verifyPassword({
          password,
          hash: account.password,
        });

        return { data: isValid, cookies: [] };
      } catch (e) {
        logger.error(safeErrorFields(e), 'checkPassword Error');
        return { data: false, cookies: [] };
      }
    },

    async validateResetToken(token: string): Promise<AuthResult<boolean>> {
      try {
        const identifier = `reset-password:${token}`;

        const verification = await prisma.verification.findFirst({
          where: {
            identifier,
            expiresAt: { gt: new Date() },
          },
        });
        logger.debug(
          {
            verificationId: verification?.id,
            expiresAt: verification?.expiresAt,
          },
          `Verification result`,
        );
        return { data: !!verification, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },
  };
}
