import { appConfig, authConfig, httpConfig } from '#src/config/index.js';
import type { CachePort } from '#src/infrastructure/cache/cache.port.js';
import type { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import {
  ADMIN_ROLES,
  AUTHORIZATION_STATEMENTS,
  DEFAULT_ROLE,
  ROLE_GRANTS,
} from '#src/modules/authorization/permissions.catalog.js';
import type {
  AuthEmailLocaleSource,
  AuthEmailSenderPort,
} from './auth.ports.js';
import type { ConfigType } from '@nestjs/config';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAccessControl } from 'better-auth/plugins/access';
import { admin, openAPI, organization } from 'better-auth/plugins';

/**
 * The Better Auth instance is a plain object built by a factory, not a class,
 * so it needs an explicit injection token — the one place in the application
 * where a symbol token is unavoidable. Everything else injects by class.
 */
export const BETTER_AUTH = Symbol('BETTER_AUTH');

/**
 * Better Auth names its own keys — a bare session token, or
 * `active-sessions-<userId>`, or a rate-limit counter — so they arrive with no
 * namespace of their own. Give them one, so its Redis footprint is separable
 * from the application's for inspection, purging and test cleanup.
 */
const BETTER_AUTH_KEY_PREFIX = 'ba';

const betterAuthKey = (key: string) => `${BETTER_AUTH_KEY_PREFIX}:${key}`;

/**
 * Snapshots the language-relevant parts of the request Better Auth hands to its
 * email callbacks, so the sender receives them as an explicit argument instead
 * of reaching for ambient request state.
 */
function readLocaleSource(request?: Request): AuthEmailLocaleSource {
  if (!request) return {};

  const headers = Object.fromEntries(request.headers.entries());
  let query: Record<string, string> = {};
  try {
    query = Object.fromEntries(new URL(request.url).searchParams.entries());
  } catch {
    // Relative or malformed URLs carry no query hints; headers still apply.
  }

  return { headers, query };
}

type BetterAuthLogger = {
  error(value: unknown, message?: string): void;
  warn(value: unknown, message?: string): void;
  info(value: unknown, message?: string): void;
  debug(value: unknown, message?: string): void;
};

const authAccessControl = createAccessControl(AUTHORIZATION_STATEMENTS);

const betterAuthRoles = {
  user: authAccessControl.newRole(ROLE_GRANTS.user),
  admin: authAccessControl.newRole(ROLE_GRANTS.admin),
};

export function createBetterAuth(
  prisma: PrismaService,
  authConfiguration: ConfigType<typeof authConfig>,
  appConfiguration: ConfigType<typeof appConfig>,
  httpConfiguration: ConfigType<typeof httpConfig>,
  emailHooks: AuthEmailSenderPort,
  logger: BetterAuthLogger,
  /**
   * Redis, as Better Auth's session and rate-limit store. Optional so the CLI
   * shim can build an instance without a Redis connection: it only creates
   * users, which always live in the database.
   */
  cache?: CachePort,
) {
  const {
    sessionTokenCookie,
    sessionDataCookie,
    betterAuthSecret,
    betterAuthUrl,
    session: sessionConfig,
  } = authConfiguration;

  const isProd = appConfiguration.isProduction;
  const domainAllowlist = httpConfiguration.cookies.domainAllowlist;
  const COOKIE_DOMAIN = isProd ? domainAllowlist[0] : undefined;

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    domain: COOKIE_DOMAIN,
    secure: isProd,
    sameSite: 'lax' as const, // Lax is generally safer and works for oAuth on localhost
  };

  const authUrl = new URL(betterAuthUrl);
  const basePath = authUrl.pathname.replace(/\/$/, '') || '/api/auth';

  const options = {
    baseURL: authUrl.origin,
    basePath,
    secret: betterAuthSecret,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),

    /**
     * Redis is the fast path for reading an active session, replacing a
     * per-request Postgres lookup. Better Auth owns the whole lifecycle here —
     * it writes the session under its token, maintains its own
     * `active-sessions-<userId>` index, and purges both on revocation.
     *
     * Paired with `session.storeSessionInDatabase` below, Redis is a *cache*,
     * not the source of truth: `findSession` falls back to Postgres when the
     * key is absent, so an eviction or a Redis restart does not sign anyone
     * out. That fallback is what `preserveSessionInDatabase` would switch off,
     * and it is deliberately not set.
     *
     * Configuring this also moves Better Auth's own rate limiter off in-process
     * memory and onto Redis, so its counters are shared across instances.
     */
    secondaryStorage: cache && {
      get: (key: string) => cache.get(betterAuthKey(key)),
      set: (key: string, value: string, ttl?: number) =>
        cache.set(betterAuthKey(key), value, ttl),
      // `del` answers with the number of keys removed; the port expects void.
      delete: async (key: string) => {
        await cache.del(betterAuthKey(key));
      },
    },

    // `/auth/*` is served by Better Auth's own handler, outside the Nest guard
    // chain, so Better Auth's origin check is the CSRF protection for these
    // routes. Declare the browser origins explicitly instead of relying on the
    // baseURL-only default. See docs/auth-authorization.md.
    trustedOrigins: [authUrl.origin, ...httpConfiguration.cors.originAllowlist],

    plugins: [
      admin({
        ac: authAccessControl,
        roles: betterAuthRoles,
        defaultRole: DEFAULT_ROLE,
        adminRoles: [...ADMIN_ROLES],
      }),
      organization(),
      openAPI({ disableDefaultReference: true }),
    ],

    rateLimit: {
      enabled: httpConfiguration.rateLimit.enabled,
      window: httpConfiguration.rateLimit.durationSec,
      max: httpConfiguration.rateLimit.points,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
      },
    },

    // Every email callback forwards Better Auth's own `url` verbatim and passes
    // the request through for language resolution. Sending never throws, so a
    // failed email cannot fail the auth operation that triggered it.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }, request) =>
        emailHooks.sendResetPasswordEmail({
          user,
          url,
          localeSource: readLocaleSource(request),
        }),
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 86400, // 24 hours
      sendVerificationEmail: async ({ user, url }, request) =>
        emailHooks.sendVerificationEmail({
          user,
          url,
          localeSource: readLocaleSource(request),
        }),
    },

    advanced: {
      cookiePrefix: isProd ? 'core' : 'core-dev',
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
      },
      cookies: {
        session_token: {
          name: sessionTokenCookie,
          attributes: cookieOptions,
        },
        session_data: {
          name: sessionDataCookie,
          attributes: cookieOptions,
        },
        state: {
          attributes: cookieOptions,
        },
      },
    },

    user: {
      modelName: 'User',
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }, request) =>
          emailHooks.sendChangeEmailConfirmation({
            user,
            newEmail,
            url,
            localeSource: readLocaleSource(request),
          }),
      },
      deleteUser: {
        enabled: true,
      },
      additionalFields: {
        locale: { type: 'string', required: false },
      },
    },

    session: {
      modelName: 'Session',
      // Keep writing sessions to Postgres even though secondary storage is
      // configured. This is what makes Redis a cache rather than the record.
      storeSessionInDatabase: true,
      expiresIn: sessionConfig.persistentExpiresInSec,
      updateAge: sessionConfig.rollingUpdateAgeSec,
      additionalFields: {
        city: { type: 'string', required: false },
        country: { type: 'string', required: false },
      },
    },

    account: { modelName: 'Account' },
    verification: { modelName: 'Verification' },

    socialProviders: {
      google: {
        clientId: authConfiguration.providers.google.clientId || '',
        clientSecret: authConfiguration.providers.google.clientSecret || '',
        enabled: !!authConfiguration.providers.google.clientId,
      },
      github: {
        clientId: authConfiguration.providers.github.clientId || '',
        clientSecret: authConfiguration.providers.github.clientSecret || '',
        enabled: !!authConfiguration.providers.github.clientId,
      },
    },

    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            if (session.ipAddress) {
              try {
                const geoip = await import('geoip-lite');
                const geo = geoip.default.lookup(session.ipAddress);
                if (geo) {
                  await prisma.session.update({
                    where: { id: session.id },
                    data: {
                      city: geo.city || null,
                      country: geo.country || null,
                    },
                  });

                  logger.debug(
                    { city: geo.city, country: geo.country },
                    'Session geolocation stored',
                  );
                }
              } catch (err) {
                logger.warn(err, 'Session geolocation failed');
              }
            }
          },
        },
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(options);
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;
