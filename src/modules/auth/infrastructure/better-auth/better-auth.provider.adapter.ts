import {
  AppConfigService,
  PrismaService,
  RedisService,
  resolveLocaleFromSource,
  type RequestContext,
} from '#src/core/index.js';
import {
  AuthCacheKeys,
  AuthException,
} from '#src/modules/auth/application/index.js';
import {
  LinkedAccount,
  Session,
  User,
  type AuthProviderPort,
  type AuthResult,
  type ChangeEmailCommand,
  type ChangePasswordCommand,
  type CookieDirective,
  type ForgetPasswordCommand,
  type GetSessionResult,
  type LinkSocialCommand,
  type ResetPasswordCommand,
  type SignInCommand,
  type SignInResultData,
  type SignInSocialCommand,
  type SignOutCommand,
  type SignUpCommand,
  type SignUpResultData,
  type TokenResult,
  type UnlinkAccountCommand,
  type VerifyEmailCommand,
} from '#src/modules/auth/domain/index.js';
import { Injectable } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { PinoLogger } from 'nestjs-pino';
import { createBetterAuth, type BetterAuthInstance } from './auth.js';
import { mapBetterAuthError } from './better-auth-errors.js';
import { AuthEmailHooks } from './hooks/auth-email.hooks.js';

import { verifyPassword } from 'better-auth/crypto';

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
  if (ctx.ip && !h['x-forwarded-for']) {
    h['x-forwarded-for'] = ctx.ip;
  }
  if (ctx.userAgent && !h['user-agent']) {
    h['user-agent'] = ctx.userAgent;
  }

  return h;
}

function parseAttributes(parts: string[]): CookieDirective['options'] {
  const options: {
    path?: string;
    domain?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    expires?: Date;
  } = {};
  for (const part of parts) {
    const p = part.trim().toLowerCase();
    if (p.startsWith('path=')) options.path = part.trim().substring(5);
    else if (p.startsWith('domain=')) options.domain = part.trim().substring(7);
    else if (p === 'httponly') options.httpOnly = true;
    else if (p === 'secure') options.secure = true;
    else if (p.startsWith('samesite='))
      options.sameSite = part.trim().substring(9).toLowerCase() as
        | 'strict'
        | 'lax'
        | 'none';
    else if (p.startsWith('max-age='))
      options.maxAge = parseInt(part.trim().substring(8));
  }
  return options;
}

/** Minimal shape of a Fastify request for the BetterAuth node handler bridge. */
interface FastifyLikeRequest {
  raw: import('http').IncomingMessage;
  ip: string;
  cookies?: Record<string, string>;
}

/** Minimal shape of a Fastify reply for the BetterAuth node handler bridge. */
interface FastifyLikeReply {
  raw: import('http').ServerResponse;
}

/** Typed shape for errors thrown by BetterAuth API calls in catch blocks. */
interface BetterAuthErrorLike {
  status?: number;
  statusCode?: number;
  body?: { statusCode?: number };
  url?: string;
  response?: { url?: string };
  headers?: Headers;
}

function readCookiesFromHeaders(headers: Headers): CookieDirective[] {
  if (!headers) return [];
  const directives: CookieDirective[] = [];
  const anyHeaders = headers as unknown as { getSetCookie?: () => string[] }; // Headers.getSetCookie() is not in all TS lib typings
  let cookies: string[] = [];

  if (typeof anyHeaders.getSetCookie === 'function') {
    cookies = anyHeaders.getSetCookie();
  } else {
    const raw = headers.get('set-cookie');
    if (raw) {
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

function safeErrorFields(e: unknown): { status?: number; code?: string } {
  const err = e as {
    status?: number;
    statusCode?: number;
    code?: string;
    body?: { code?: string };
  };
  return {
    status: err?.status ?? err?.statusCode,
    code: err?.code ?? err?.body?.code,
  };
}

/** Raw shape returned by BetterAuth API for user objects. */
interface RawBetterAuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  locale?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

/** Raw shape returned by BetterAuth API for session objects. */
interface RawBetterAuthSession {
  id: string;
  userId: string;
  expiresAt?: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  city?: string | null;
  country?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/** Raw shape for linked account data. */
interface RawBetterAuthLinkedAccount {
  id: string;
  provider: string;
  providerId: string;
  accountId: string;
  createdAt?: string | Date;
}

@Injectable()
export class BetterAuthProvider implements AuthProviderPort {
  private readonly auth: BetterAuthInstance;
  private readonly nodeHandler;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly authEmailHooks: AuthEmailHooks,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BetterAuthProvider.name);
    this.auth = createBetterAuth(
      this.prisma,
      this.config,
      this.authEmailHooks,
      this.logger,
    );
    this.nodeHandler = toNodeHandler(this.auth);
  }

  private hydrateUser(raw: unknown): User {
    if (!raw) return null as unknown as User;
    const r = raw as RawBetterAuthUser;
    return new User(
      r.id,
      r.email,
      r.emailVerified === true,
      r.name || '',
      r.firstName || null,
      r.lastName || null,
      r.image || null,
      r.locale || null,
      [], // roles
      [], // permissions
      r.createdAt ? new Date(r.createdAt) : new Date(),
      r.updatedAt ? new Date(r.updatedAt) : new Date(),
      r.deletedAt ? new Date(r.deletedAt) : null,
    );
  }

  private hydrateSession(raw: unknown): Session {
    if (!raw) return null as unknown as Session;
    const r = raw as RawBetterAuthSession;
    return new Session(
      r.id,
      r.userId,
      r.expiresAt ? new Date(r.expiresAt) : new Date(),
      r.ipAddress || null,
      r.userAgent || null,
      r.city || null,
      r.country || null,
      r.createdAt ? new Date(r.createdAt) : new Date(),
      r.updatedAt ? new Date(r.updatedAt) : new Date(),
      undefined,
    );
  }

  private hydrateLinkedAccount(raw: unknown): LinkedAccount {
    if (!raw) return null as unknown as LinkedAccount;
    const r = raw as RawBetterAuthLinkedAccount;
    return new LinkedAccount(
      r.id,
      r.provider,
      r.providerId,
      r.accountId,
      r.createdAt ? new Date(r.createdAt) : new Date(),
    );
  }

  async handleRequest(req: unknown, res: unknown): Promise<void> {
    const fastifyReq = req as FastifyLikeRequest;
    const request = fastifyReq.raw;
    const fastifyRes = res as FastifyLikeReply;
    const response = fastifyRes.raw;

    // Bridge: Ensure the IP detected by Fastify (respecting trustProxy)
    // is passed to BetterAuth via the x-forwarded-for header if not already present.
    let clientIp = fastifyReq.ip;

    if (this.config.app().env === 'test') {
      const testIp = fastifyReq.cookies?.['x-test-ip'];
      if (testIp) {
        clientIp = testIp;
      }
    }

    if (clientIp && !request.headers['x-forwarded-for']) {
      request.headers['x-forwarded-for'] = clientIp;
    }

    await this.nodeHandler(request, response);
  }

  private rethrowAsAppException(e: unknown): never {
    this.logger.error(safeErrorFields(e), 'BetterAuth Internal Error');
    if (e instanceof AuthException) throw e;
    mapBetterAuthError(e);
  }

  async signUpEmail(cmd: SignUpCommand): Promise<AuthResult<SignUpResultData>> {
    try {
      const { email, password, firstName, lastName, context } = cmd;
      const { headerName, queryName } = this.config.i18n();
      const locale =
        resolveLocaleFromSource(
          { headers: context.headers, query: context.query },
          headerName,
          queryName,
        ) || undefined;

      const name = buildFullName(firstName, lastName);

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
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
        data: {
          token: undefined as unknown as string,
          user: this.hydrateUser(response.user),
        },
        cookies: readCookiesFromHeaders(headers),
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async signInEmail(cmd: SignInCommand): Promise<AuthResult<SignInResultData>> {
    try {
      const { email, password, rememberMe, redirect, callbackURL, context } =
        cmd;

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
        data: {
          redirect: redirect ?? response.redirect ?? false,
          token: undefined as unknown as string,
          url: response.url,
          user: this.hydrateUser(response.user),
        },
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

      // Invalidate all cached sessions for this user in Redis
      if (cmd.context.userId) {
        await this.invalidateUserSessions(cmd.context.userId);
      }

      // Also delete the specific session token cache key
      if (cmd.context.sessionToken) {
        const sessionKey = this.redisService.key(
          AuthCacheKeys.session(cmd.context.sessionToken),
        );
        await this.redisService.raw().del(sessionKey);
      }

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
        ? new Headers(cmd.headers as Record<string, string>)
        : toHeadersFromContext(cmd.context);

      const result = await this.auth.api.getSession({
        headers,
      });

      if (result) {
        const u = result.user;
        const s = result.session;
        if (
          (u as Record<string, unknown>)?.deletedAt ||
          (s as Record<string, unknown>)?.deletedAt
        ) {
          return null;
        }
        return {
          user: this.hydrateUser(u),
          session: this.hydrateSession(s),
        };
      }

      return null;
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
      return { data: undefined, cookies: readCookiesFromHeaders(res.headers) };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async forgetPassword(cmd: ForgetPasswordCommand): Promise<AuthResult<void>> {
    try {
      const { email, context } = cmd;

      await this.auth.api.requestPasswordReset({
        body: { email },
        headers: toHeadersFromContext(context),
      });

      // requestPasswordReset returns { status, message } — no headers
      const cookies: CookieDirective[] = [];

      return {
        data: undefined,
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
      return { data: undefined, cookies: readCookiesFromHeaders(res.headers) };
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
      return { data: undefined, cookies: readCookiesFromHeaders(res.headers) };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async changeEmail(cmd: ChangeEmailCommand): Promise<AuthResult<TokenResult>> {
    try {
      const res = await this.auth.api.changeEmail({
        body: { newEmail: cmd.newEmail, callbackURL: cmd.callbackURL },
        headers: toHeadersFromContext(cmd.context),
        returnHeaders: true,
      });

      return {
        data: {
          token:
            ((res.response as Record<string, unknown>)?.token as string) || '',
        },
        cookies: readCookiesFromHeaders(res.headers),
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
        data: res.map((s) => this.hydrateSession(s)),
        cookies: [],
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async revokeSession(
    sessionId: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw AuthException.sessionNotFound();
      }

      await this.auth.api.revokeSession({
        body: { token: session.token },
        headers: toHeadersFromContext(context),
      });

      await this.invalidateUserSessions(session.userId);

      const sessionKey = this.redisService.key(
        AuthCacheKeys.session(session.token),
      );
      await this.redisService.raw().del(sessionKey);

      return { data: undefined, cookies: [] };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async revokeSessions(
    sessionIds: string[],
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: { id: { in: sessionIds } },
        select: { userId: true, token: true, id: true },
      });

      if (sessions.length === 0) {
        throw AuthException.sessionNotFound();
      }

      const headers = toHeadersFromContext(context);
      await Promise.all(
        sessions.map((s) =>
          this.auth.api.revokeSession({
            body: { token: s.token },
            headers,
          }),
        ),
      );

      const uniqueUserIds = [...new Set(sessions.map((s) => s.userId))];
      await Promise.all(
        uniqueUserIds.map((uid) => this.invalidateUserSessions(uid)),
      );

      const keysToDelete = sessions.map((s) =>
        this.redisService.key(AuthCacheKeys.session(s.token)),
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

      const account = await this.prisma.account.findFirst({
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
      this.logger.error(safeErrorFields(e), 'checkPassword Error');
      return { data: false, cookies: [] };
    }
  }

  async validateResetToken(token: string): Promise<AuthResult<boolean>> {
    try {
      const identifier = `reset-password:${token}`;

      const verification = await this.prisma.verification.findFirst({
        where: {
          identifier,
          expiresAt: { gt: new Date() },
        },
      });
      this.logger.debug(
        {
          verificationId: verification?.id,
          expiresAt: verification?.expiresAt,
        },
        `Verification result`,
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
      const res = await this.auth.api.updateUser({
        body: input,
        headers: toHeadersFromContext(context),
      });

      const userId = context.userId;
      if (userId) {
        await this.invalidateUserSessions(userId);
      }

      return {
        data: { ...this.hydrateUser(res), status: true } as User & {
          status: boolean;
        },
        cookies: [],
      };
    } catch (e) {
      this.rethrowAsAppException(e);
    }
  }

  async deleteUser(context: RequestContext): Promise<AuthResult<void>> {
    try {
      await this.auth.api.deleteUser({
        headers: toHeadersFromContext(context),
        body: {},
      });

      if (context.userId) {
        await this.invalidateUserSessions(context.userId);
      }

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
        return { data: undefined, cookies: [] };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: null },
      });

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
      const res = await this.auth.api.signInSocial({
        body: { provider, callbackURL },
        headers: toHeadersFromContext(context),
        returnHeaders: true,
      });

      const { headers, response } = res;
      const data = response;
      const cookies = readCookiesFromHeaders(headers);

      if (context.ip) {
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
      this.rethrowAsAppException(e);
    }
  }

  async linkSocial(
    cmd: LinkSocialCommand,
  ): Promise<AuthResult<SignInResultData>> {
    try {
      const { provider, callbackURL, context } = cmd;

      const res = await this.auth.api.linkSocialAccount({
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

      const linkedAccounts = accounts.map((acc) =>
        this.hydrateLinkedAccount({
          id: acc.id,
          provider: acc.providerId,
          providerId: acc.providerId,
          accountId: acc.accountId,
          createdAt: acc.createdAt,
        }),
      );

      return { data: linkedAccounts, cookies: [] };
    } catch (e) {
      this.logger.error(safeErrorFields(e), 'ListLinkedAccounts Error');
      this.rethrowAsAppException(e);
    }
  }

  async unlinkAccount(cmd: UnlinkAccountCommand): Promise<AuthResult<void>> {
    try {
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

    this.logger.info({ userId }, 'Invalidating user sessions');

    const keys = await this.redisService.raw().smembers(userSessionsKey);

    if (keys.length > 0) {
      this.logger.debug({ count: keys.length }, 'Deleting cached session keys');
      await this.redisService.raw().del(...keys);
    }

    await this.redisService.raw().del(userSessionsKey);
  }

  async invalidateAllSessions(): Promise<void> {
    const pattern = AuthCacheKeys.session('*');
    await this.redisService.deleteByPattern(pattern);
  }
}
