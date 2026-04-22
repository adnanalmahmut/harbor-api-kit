// BetterAuth-bound adapter operations for the credentials concern
// (sign-up / sign-in). Infrastructure only — these are NOT application
// services or use cases. Use cases live under
// `src/modules/auth/application/use-cases/` and depend on
// `AuthProviderPort`, which the facade in this directory implements.
import { resolveLocaleFromSource } from '#src/core/index.js';
import { AuthException } from '../../application/index.js';
import type {
  AuthResult,
  SignInCommand,
  SignInResultData,
  SignUpCommand,
  SignUpResultData,
} from '../../domain/index.js';
import type { BetterAuthDeps } from './better-auth.deps.js';
import {
  buildFullName,
  readCookiesFromHeaders,
  rethrowAsAppException,
  toHeadersFromContext,
} from './better-auth.helpers.js';
import { hydrateUser } from './better-auth.hydrators.js';

export function createCredentialsOps(deps: BetterAuthDeps) {
  const { auth, prisma, config, logger } = deps;

  return {
    async signUpEmail(
      cmd: SignUpCommand,
    ): Promise<AuthResult<SignUpResultData>> {
      try {
        const { email, password, firstName, lastName, context } = cmd;
        const { headerName, queryName } = config.i18n();
        const locale =
          resolveLocaleFromSource(
            { headers: context.headers, query: context.query },
            headerName,
            queryName,
          ) || undefined;

        const name = buildFullName(firstName, lastName);

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw AuthException.emailAlreadyExists();
        }

        const { headers, response } = await auth.api.signUpEmail({
          returnHeaders: true,
          body: {
            email,
            password,
            name,
            firstName,
            lastName,
            locale,
          } as unknown as { email: string; password: string; name: string },
          headers: toHeadersFromContext(context),
        });

        return {
          data: {
            token: undefined as unknown as string,
            user: hydrateUser(response.user),
          },
          cookies: readCookiesFromHeaders(headers),
        };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async signInEmail(
      cmd: SignInCommand,
    ): Promise<AuthResult<SignInResultData>> {
      try {
        const { email, password, rememberMe, redirect, callbackURL, context } =
          cmd;

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser?.deletedAt) {
          throw AuthException.invalidCredentials();
        }

        const { headers, response } = await auth.api.signInEmail({
          returnHeaders: true,
          body: { email, password, rememberMe, callbackURL },
          headers: toHeadersFromContext(context),
        });

        return {
          data: {
            redirect: redirect ?? response.redirect ?? false,
            token: undefined as unknown as string,
            url: response.url,
            user: hydrateUser(response.user),
          },
          cookies: readCookiesFromHeaders(headers),
        };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },
  };
}
