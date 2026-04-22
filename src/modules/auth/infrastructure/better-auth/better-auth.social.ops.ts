import type { RequestContext } from '#src/core/index.js';
import { AuthException } from '../../application/index.js';
import type {
  AuthResult,
  LinkedAccount,
  LinkSocialCommand,
  SignInResultData,
  SignInSocialCommand,
  UnlinkAccountCommand,
  User,
} from '../../domain/index.js';
import type { BetterAuthDeps } from './better-auth.deps.js';
import {
  readCookiesFromHeaders,
  rethrowAsAppException,
  safeErrorFields,
  toHeadersFromContext,
  type BetterAuthErrorLike,
} from './better-auth.helpers.js';
import { hydrateLinkedAccount } from './better-auth.hydrators.js';

export function createSocialOps(deps: BetterAuthDeps) {
  const { auth, prisma, config, logger } = deps;

  return {
    async signInSocial(
      cmd: SignInSocialCommand,
    ): Promise<AuthResult<SignInResultData>> {
      try {
        const { provider, callbackURL, context } = cmd;
        const res = await auth.api.signInSocial({
          body: { provider, callbackURL },
          headers: toHeadersFromContext(context),
          returnHeaders: true,
        });

        const { headers, response } = res;
        const data = response;
        const cookies = readCookiesFromHeaders(headers);

        if (config.app().env === 'test' && context.ip) {
          cookies.push({
            name: 'x-test-ip',
            value: context.ip,
            options: { maxAge: 300, path: '/', httpOnly: true },
          });
        }

        return {
          data: {
            redirect: data?.redirect ?? true,
            token: '',
            url: 'url' in data ? data.url : '',
            user: null as unknown as User,
          },
          cookies,
        };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },

    async linkSocial(
      cmd: LinkSocialCommand,
    ): Promise<AuthResult<SignInResultData>> {
      try {
        const { provider, callbackURL, context } = cmd;

        const res = await auth.api.linkSocialAccount({
          body: { provider, callbackURL },
          headers: toHeadersFromContext(context),
          returnHeaders: true,
        });

        const { headers, response } = res;

        return {
          data: {
            redirect: true,
            token: '',
            url: response?.url || '',
            user: null as unknown as User,
          },
          cookies: readCookiesFromHeaders(headers),
        };
      } catch (e: unknown) {
        const err = e as BetterAuthErrorLike;
        const status = Number(
          err?.status ?? err?.statusCode ?? err?.body?.statusCode,
        );
        const isSuccess = status === 200;

        if (isSuccess) {
          const url = String(err?.url ?? err?.response?.url ?? '');
          const headers = err?.headers;

          return {
            data: {
              redirect: true,
              token: '',
              url,
              user: null as unknown as User,
            },
            cookies: headers ? readCookiesFromHeaders(headers) : [],
          };
        }

        rethrowAsAppException(e, logger);
      }
    },

    async listLinkedAccounts(
      context: RequestContext,
    ): Promise<AuthResult<LinkedAccount[]>> {
      try {
        const accounts = await prisma.account.findMany({
          where: { userId: context.userId },
        });

        const linkedAccounts = accounts.map((acc) =>
          hydrateLinkedAccount({
            id: acc.id,
            provider: acc.providerId,
            providerId: acc.providerId,
            accountId: acc.accountId,
            createdAt: acc.createdAt,
          }),
        );

        return { data: linkedAccounts, cookies: [] };
      } catch (e) {
        logger.error(safeErrorFields(e), 'ListLinkedAccounts Error');
        rethrowAsAppException(e, logger);
      }
    },

    async unlinkAccount(cmd: UnlinkAccountCommand): Promise<AuthResult<void>> {
      try {
        if (!cmd.context.userId) throw AuthException.unauthorized();

        const account = await prisma.account.findFirst({
          where: {
            userId: cmd.context.userId,
            providerId: cmd.providerId,
          },
        });

        if (!account) {
          throw AuthException.accountNotFound();
        }

        await prisma.account.delete({
          where: { id: account.id },
        });

        return { data: undefined, cookies: [] };
      } catch (e) {
        rethrowAsAppException(e, logger);
      }
    },
  };
}
