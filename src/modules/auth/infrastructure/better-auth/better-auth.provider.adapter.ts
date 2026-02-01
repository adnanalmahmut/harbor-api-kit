import type { RequestContext } from '#src/core/context/request-context.type.js';
import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { resolveLocaleFromSource } from '#src/infrastructure/i18n/i18n-helpers.js';
import type { CookieDirective } from '#src/modules/auth/application/common/cookie-directive.js';
import {
  type AuthProviderPort,
  type AuthResult,
  type ChangeEmailCommand,
  type ChangePasswordCommand,
  type ForgetPasswordCommand,
  type GetSessionResult,
  type LinkedAccount,
  type LinkSocialCommand,
  type ResetPasswordCommand,
  type Session,
  type SignInCommand,
  type SignInResultData,
  type SignInSocialCommand,
  type SignOutCommand,
  type SignUpCommand,
  type SignUpResultData,
  type TokenResult,
  type UnlinkAccountCommand,
  type User,
  type VerifyEmailCommand,
} from '#src/modules/auth/application/ports/index.js';
import { createBetterAuth } from '#src/modules/auth/infrastructure/better-auth/auth.js';
import { mapBetterAuthError } from '#src/modules/auth/infrastructure/better-auth/better-auth-error.mapper.js';
import { AuthEmailHooks } from '#src/modules/auth/infrastructure/better-auth/hooks/auth-email.hooks.js';
import { AppConfigService } from '#src/shared/config/app-config.service.js';
import { Injectable, Logger } from '@nestjs/common';

function toHeadersFromContext(ctx: RequestContext): Record<string, string> {
  const h: Record<string, string> = {};
  const headers = ctx.headers ?? {};
  const prohibited = ['content-length', 'content-type', 'host', 'connection'];

  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    if (prohibited.includes(k.toLowerCase())) continue;

    if (Array.isArray(v)) h[k] = v.join(',');
    else h[k] = String(v);
  }
  /* Inject IP and User-Agent if valid and missing in headers */
  if (ctx.ip && !h['x-forwarded-for']) {
    h['x-forwarded-for'] = ctx.ip;
  }
  if (ctx.userAgent && !h['user-agent']) {
    h['user-agent'] = ctx.userAgent;
  }

  return h;
}

function parseAttributes(parts: string[]): CookieDirective['options'] {
  const options: CookieDirective['options'] = {};
  for (const part of parts) {
    const p = part.trim().toLowerCase();
    if (p.startsWith('path=')) options.path = part.trim().substring(5);
    else if (p.startsWith('domain=')) options.domain = part.trim().substring(7);
    else if (p === 'httponly') options.httpOnly = true;
    else if (p === 'secure') options.secure = true;
    else if (p.startsWith('samesite='))
      options.sameSite = part.trim().substring(9).toLowerCase() as any;
    else if (p.startsWith('max-age='))
      options.maxAge = parseInt(part.trim().substring(8));
    // expires handling omitted for brevity, usually not needed for better-auth defaults
  }
  return options;
}

function readCookiesFromHeaders(headers: Headers): CookieDirective[] {
  if (!headers) return [];
  const directives: CookieDirective[] = [];
  const anyHeaders = headers as any;
  let cookies: string[] = [];

  if (typeof anyHeaders.getSetCookie === 'function') {
    cookies = anyHeaders.getSetCookie();
  } else {
    const raw = headers.get('set-cookie');
    if (raw) {
      // Naive split, but BetterAuth usually sends valid cookies.
      // Correct splitting of set-cookie string is complex due to dates.
      // Assuming framework handles it or returns array via getSetCookie (Node 18+).
      // Fallback split by comma might break dates.
      // For now, assume Node 18+ set-cookie array availability or robust polyfill if needed.
      cookies = raw.split(/,(?=[^;]+?=)/g);
    }
  }

  for (const cookieStr of cookies) {
    const parts = cookieStr.split(';');
    const firstPart = parts[0];
    const eqIdx = firstPart.indexOf('=');
    if (eqIdx > 0) {
      const name = firstPart.substring(0, eqIdx).trim();
      const value = firstPart.substring(eqIdx + 1).trim();
      const options = parseAttributes(parts.slice(1));
      directives.push({ name, value, options });
    }
  }
  return directives;
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { AuthCacheKeys } from '#src/modules/auth/application/cache/auth-cache.keys.js';
import { AuthException } from '#src/modules/auth/application/exceptions/auth.exception.js';
import { toNodeHandler } from 'better-auth/node';

@Injectable()
export class BetterAuthProvider implements AuthProviderPort {
  private readonly logger = new Logger(BetterAuthProvider.name);
  private readonly auth;
  private readonly nodeHandler;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly authEmailHooks: AuthEmailHooks,
    private readonly redisService: RedisService,
  ) {
    this.auth = createBetterAuth(
      this.prisma,
      this.config,
      this.authEmailHooks,
      {
        socialProviders: {
          google: {
            clientId: this.config.auth().google.clientId,
            clientSecret: this.config.auth().google.clientSecret,
          },
        },
      },
    );
    this.nodeHandler = toNodeHandler(this.auth);
  }

  async handleRequest(req: any, res: any): Promise<void> {
    // Handling Fastify or Express request objects
    // If Fastify, req.raw and res.raw are the Node.js native objects.
    const request = req.raw || req;
    const response = res.raw || res;
    await this.nodeHandler(request, response);
  }

  private rethrowAsAppException(e: unknown): never {
    if (e instanceof AuthException) throw e;
    mapBetterAuthError(e);
  }

  async signUpEmail(cmd: SignUpCommand): Promise<AuthResult<SignUpResultData>> {
    try {
      const { email, password, firstName, lastName, context } = cmd;
      const { headerName, queryName } = this.config.i18n();
      const locale =
        cmd.locale ||
        resolveLocaleFromSource(
          { headers: context.headers as any, query: context.query as any },
          headerName,
          queryName,
        ) ||
        undefined;

      const name = buildFullName(firstName, lastName);

      // Check if user exists (including soft deleted)
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // If deleted, they should reactivate, but standard register flows usually say "Email taken"
        // to prevent enumeration or guide them to login/reactivate.
        throw AuthException.emailAlreadyExists();
      }

      const { headers, response } = await this.auth.api.signUpEmail({
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
        data: response as SignUpResultData,
        cookies: readCookiesFromHeaders(headers),
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async signInEmail(cmd: SignInCommand): Promise<AuthResult<SignInResultData>> {
    try {
      const { email, password, rememberMe, callbackURL, context } = cmd;

      // Check for soft-deleted user
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser?.deletedAt) {
        throw AuthException.invalidCredentials();
      }

      const { headers, response } = await this.auth.api.signInEmail({
        returnHeaders: true,
        body: { email, password, rememberMe, callbackURL },
        headers: toHeadersFromContext(context),
      });

      return {
        data: response,
        cookies: readCookiesFromHeaders(headers),
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async signOut(cmd: SignOutCommand): Promise<AuthResult<void>> {
    try {
      const { headers } = await this.auth.api.signOut({
        returnHeaders: true,
        headers: toHeadersFromContext(cmd.context),
      });
      return { data: undefined, cookies: readCookiesFromHeaders(headers) };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async getSession(cmd: {
    context: RequestContext;
    headers?: Record<string, string | string[] | undefined>;
  }): Promise<GetSessionResult> {
    try {
      const headers = cmd.headers
        ? new Headers(cmd.headers as any)
        : toHeadersFromContext(cmd.context);

      const result = await this.auth.api.getSession({
        headers,
      });

      if (result) {
        // Check if user or session is soft deleted
        const u = result.user as any;
        const s = result.session as any;
        if (u?.deletedAt || s?.deletedAt) {
          return null;
        }
      }

      return result;
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async verifyEmail(cmd: VerifyEmailCommand): Promise<AuthResult<void>> {
    try {
      const res = await this.auth.api.verifyEmail({
        query: { token: cmd.token },
        headers: toHeadersFromContext(cmd.context),
        returnHeaders: true,
      });
      const { headers } = res as any;
      return { data: undefined, cookies: readCookiesFromHeaders(headers) };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async forgetPassword(
    cmd: ForgetPasswordCommand,
  ): Promise<AuthResult<TokenResult>> {
    try {
      const { email, context, redirectTo } = cmd;
      const res = await (this.auth.api as any).requestPasswordReset({
        body: { email, redirectTo },
        headers: toHeadersFromContext(context),
      });

      // Handling different return shapes from better-auth versions
      const headers = res?.headers;
      const response = res?.response ?? res?.data;

      // Ensure headers are valid
      const cookies = headers ? readCookiesFromHeaders(headers) : [];

      let token = response?.token;

      if (!token) {
        const verification = await this.prisma.verification.findFirst({
          where: { identifier: email },
          orderBy: { expiresAt: 'desc' },
        });
        if (verification) token = verification.value;
      }

      return {
        data: { token: token || '' },
        cookies,
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async resetPassword(cmd: ResetPasswordCommand): Promise<AuthResult<void>> {
    try {
      const res = await this.auth.api.resetPassword({
        body: { newPassword: cmd.newPassword, token: cmd.token },
        headers: toHeadersFromContext(cmd.context),
        returnHeaders: true,
      });
      const { headers } = res as any;
      return { data: undefined, cookies: readCookiesFromHeaders(headers) };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async changePassword(cmd: ChangePasswordCommand): Promise<AuthResult<void>> {
    try {
      const res = await this.auth.api.changePassword({
        body: {
          currentPassword: cmd.currentPassword,
          newPassword: cmd.newPassword,
          revokeOtherSessions: cmd.revokeOtherSessions,
        },
        headers: toHeadersFromContext(cmd.context),
        returnHeaders: true,
      });
      const { headers } = res as any;
      return { data: undefined, cookies: readCookiesFromHeaders(headers) };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async changeEmail(cmd: ChangeEmailCommand): Promise<AuthResult<TokenResult>> {
    try {
      const res = await this.auth.api.changeEmail({
        body: { newEmail: cmd.newEmail, callbackURL: cmd.callbackURL },
        headers: toHeadersFromContext(cmd.context),
      });

      const { headers, response } = res as any;

      return {
        data: { token: response?.token || '' },
        cookies: readCookiesFromHeaders(headers),
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async listSessions(context: RequestContext): Promise<AuthResult<Session[]>> {
    try {
      const headers = toHeadersFromContext(context);
      const res = await this.auth.api.listSessions({
        headers,
      });

      return {
        data: res as unknown as Session[],
        cookies: [],
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async revokeSession(
    token: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    try {
      // Strict check: Ensure session exists before revoking
      const session = await this.prisma.session.findUnique({
        where: { token },
      });

      if (!session) {
        throw AuthException.sessionNotFound();
      }

      await this.auth.api.revokeSession({
        body: { token },
        headers: toHeadersFromContext(context),
      });

      // Invalidate cache for the session's user
      await this.invalidateUserSessions(session.userId);

      // Invalidate session cache explicit key
      const sessionKey = this.redisService.key(AuthCacheKeys.session(token));
      await this.redisService.raw().del(sessionKey);

      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async revokeSessions(
    tokens: string[],
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    try {
      // Get sessions to find affected users
      const sessions = await this.prisma.session.findMany({
        where: { token: { in: tokens } },
        select: { userId: true },
      });

      if (sessions.length === 0) {
        throw AuthException.sessionNotFound();
      }

      const headers = toHeadersFromContext(context);
      await Promise.all(
        tokens.map((token) =>
          this.auth.api.revokeSession({
            body: { token },
            headers,
          }),
        ),
      );

      // Invalidate cache for all affected users
      const uniqueUserIds = [...new Set(sessions.map((s) => s.userId))];
      await Promise.all(
        uniqueUserIds.map((uid) => this.invalidateUserSessions(uid)),
      );

      // Invalidate session keys explicit
      const keysToDelete = tokens.map((t) =>
        this.redisService.key(AuthCacheKeys.session(t)),
      );
      if (keysToDelete.length > 0) {
        await this.redisService.raw().del(...keysToDelete);
      }

      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async revokeOtherSessions(
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    try {
      await this.auth.api.revokeOtherSessions({
        headers: toHeadersFromContext(context),
      });

      // Invalidate all cached sessions for this user
      if (context.userId) {
        await this.invalidateUserSessions(context.userId);
      }

      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async requestVerificationEmail(
    email: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    try {
      await this.auth.api.sendVerificationEmail({
        body: { email },
        headers: toHeadersFromContext(context),
      });
      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async checkPassword(
    password: string,
    context: RequestContext,
  ): Promise<AuthResult<boolean>> {
    try {
      if (!context.userId) {
        throw AuthException.authenticationRequired();
      }

      // 1. Get user email
      const user = await this.prisma.user.findUnique({
        where: { id: context.userId },
        select: { email: true },
      });
      if (!user) throw AuthException.unauthorized();

      // 2. Attempt "login" to verify password
      // signInEmail creates a session if successful
      const res = await this.auth.api.signInEmail({
        body: { email: user.email, password },
        headers: toHeadersFromContext(context),
      });

      // 3. If we are here, password is correct. Revoke the just-created session.
      // The result contains the token directly.
      const data = res as any;
      const token = data?.token || data?.session?.token;

      if (token) {
        // Run revocation in background or await it.
        try {
          await this.auth.api.revokeSession({
            body: { token },
            headers: toHeadersFromContext(context),
          });
        } catch (revokeError) {
          this.logger.warn(
            'Failed to revoke temporary session in checkPassword',
            revokeError,
          );
        }
      }

      return { data: true, cookies: [] };
    } catch (e) {
      const err = e as any;
      // If unauthorized/invalid credentials - better-auth usually throws APIError
      // We check for common status codes or error codes
      if (
        err?.status === 401 ||
        err?.statusCode === 401 ||
        err?.body?.code === 'INVALID_CREDENTIALS' ||
        err?.body?.code === 'INVALID_PASSWORD' ||
        err?.code === 'INVALID_CREDENTIALS'
      ) {
        return { data: false, cookies: [] };
      }

      // Also check if message implies invalid credentials
      const msg = (err?.message || '').toLowerCase();
      if (
        msg.includes('credential') ||
        msg.includes('password') ||
        msg.includes('invalid')
      ) {
        return { data: false, cookies: [] };
      }

      // rethrow other internal errors
      this.rethrowAsAppException(e);
    }
  }

  async validateResetToken(token: string): Promise<AuthResult<boolean>> {
    try {
      // better-auth stores reset tokens in the 'identifier' field with a prefix
      // and the user ID in the 'value' field.
      // Source: better-auth/dist/api/routes/password.mjs
      const identifier = `reset-password:${token}`;

      const verification = await this.prisma.verification.findFirst({
        where: {
          identifier,
          expiresAt: { gt: new Date() },
        },
      });
      this.logger.debug(
        `Verification result: ${JSON.stringify(verification, null, 2)}`,
      );
      return { data: !!verification, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async updateUser(
    input: Partial<User>,
    context: RequestContext,
  ): Promise<AuthResult<User>> {
    try {
      const res = await (this.auth.api as any).updateUser({
        body: input,
        headers: toHeadersFromContext(context),
      });

      // Use context.userId since better-auth API doesn't return id in response
      const userId = context.userId;
      if (userId) {
        await this.invalidateUserSessions(userId);
      }

      return { data: res as unknown as User, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async deleteUser(context: RequestContext): Promise<AuthResult<void>> {
    try {
      // deleteUser usually requires password or confirmation?
      // better-auth might strictly require session.
      await (this.auth.api as any).deleteUser({
        headers: toHeadersFromContext(context),
        body: {},
      });
      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async reactivateUser(email: string): Promise<AuthResult<void>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw AuthException.userNotFound();
      }

      if (!user.deletedAt) {
        // User is already active, maybe just return success or throw conflict?
        // Idempotent success is safer.
        return { data: undefined, cookies: [] };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: null },
      });

      // Restore accounts
      await this.prisma.account.updateMany({
        where: { userId: user.id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async signInSocial(
    cmd: SignInSocialCommand,
  ): Promise<AuthResult<SignInResultData>> {
    try {
      const { provider, callbackURL, context } = cmd;
      const res = await (this.auth.api as any).signInSocial({
        body: { provider, callbackURL },
        headers: toHeadersFromContext(context),
        returnHeaders: true,
      });

      const { headers, response } = res;

      return {
        data: {
          redirect: true,
          token: '', // No token yet, it's a redirect flow
          url: response?.url || res?.url,
          user: null as any, // User not resolved yet
        },
        cookies: readCookiesFromHeaders(headers),
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async linkSocial(
    cmd: LinkSocialCommand,
  ): Promise<AuthResult<SignInResultData>> {
    try {
      const { provider, callbackURL, context } = cmd;

      // linkSocialAccount also initiates a redirect flow
      const res = await (this.auth.api as any).linkSocialAccount({
        body: { provider, callbackURL },
        headers: toHeadersFromContext(context),
        returnHeaders: true,
      });

      const { headers, response } = res;

      return {
        data: {
          redirect: true,
          token: '',
          url: response?.url || res?.url,
          user: null as any,
        },
        cookies: readCookiesFromHeaders(headers),
      };
    } catch (e: any) {
      // Reconstruct object to check hidden properties safely
      const propNames = Object.getOwnPropertyNames(e);
      const serialized = JSON.parse(JSON.stringify(e, propNames));

      const isSuccess =
        serialized.isError === false ||
        Number(serialized.statusCode) === 200 ||
        Number(serialized.status) === 200 ||
        Number(serialized.body?.statusCode) === 200;

      if (isSuccess) {
        return {
          data: {
            redirect: true,
            token: '',
            url: serialized.url || serialized.response?.url || '',
            user: null as any,
            708: readCookiesFromHeaders(serialized.headers || e.headers),
          } as any, // Cast to any to assume shape valid
          cookies: readCookiesFromHeaders(serialized.headers || e.headers),
        };
      }

      this.rethrowAsAppException(e);
    }
  }

  async listLinkedAccounts(
    context: RequestContext,
  ): Promise<AuthResult<LinkedAccount[]>> {
    try {
      const accounts = await this.prisma.account.findMany({
        where: { userId: context.userId },
      });

      const linkedAccounts = accounts.map((acc) => ({
        id: acc.id,
        provider: acc.providerId,
        providerId: acc.providerId,
        accountId: acc.accountId,
        createdAt: acc.createdAt,
      }));

      return { data: linkedAccounts, cookies: [] };
    } catch (e) {
      console.error('ListLinkedAccounts Error:', e);
      this.rethrowAsAppException(e);
    }
  }

  async unlinkAccount(cmd: UnlinkAccountCommand): Promise<AuthResult<void>> {
    try {
      // Safe path: Use Prisma to delete the account for this user and provider.
      // Ensure user owns the account (context.userId).

      if (!cmd.context.userId) throw AuthException.unauthorized();

      const account = await this.prisma.account.findFirst({
        where: {
          userId: cmd.context.userId,
          providerId: cmd.providerId,
        },
      });

      if (!account) {
        throw AuthException.accountNotFound();
      }

      await this.prisma.account.delete({
        where: { id: account.id },
      });

      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    const userSessionsKeyRaw = AuthCacheKeys.userSessions(userId);
    const userSessionsKey = this.redisService.key(userSessionsKeyRaw);

    this.logger.log(
      `Invalidating sessions for user ${userId} via Set ${userSessionsKey}`,
    );

    // Keys in the set are already prefixed by AuthGuard
    const keys = await this.redisService.raw().smembers(userSessionsKey);

    if (keys.length > 0) {
      this.logger.debug(`Deleting gathered Redis keys: ${keys.join(', ')}`);
      // Keys are already fully qualified (with prefix), use raw client directly
      await this.redisService.raw().del(...keys);
    }

    // Also delete the set itself
    await this.redisService.raw().del(userSessionsKey);
  }

  async invalidateAllSessions(): Promise<void> {
    // Delete all keys matching scp:auth:session:*
    const pattern = AuthCacheKeys.session('*');
    await this.redisService.deleteByPattern(pattern);
  }
}
