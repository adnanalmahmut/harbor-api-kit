import { appConfig, authConfig, httpConfig } from '#src/config/index.js';
import type { PrismaService } from '#src/core/index.js';
import {
  ADMIN_ROLES,
  AUTHORIZATION_STATEMENTS,
  DEFAULT_ROLE,
  ROLE_GRANTS,
} from '#src/modules/authorization/index.js';
import type { AuthEmailSenderPort } from '../../domain/index.js';
import { readLocaleSource } from './better-auth.helpers.js';
import type { ConfigType } from '@nestjs/config';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAccessControl } from 'better-auth/plugins/access';
import { admin, openAPI, organization } from 'better-auth/plugins';

/** Better Auth only needs the sending side of the auth module's email port. */
export type BetterAuthEmailHooks = AuthEmailSenderPort;

export type BetterAuthLogger = {
  error(value: unknown, message?: string): void;
  warn(value: unknown, message?: string): void;
  info(value: unknown, message?: string): void;
  debug(value: unknown, message?: string): void;
};

export const authAccessControl = createAccessControl(AUTHORIZATION_STATEMENTS);

export const betterAuthRoles = {
  user: authAccessControl.newRole(ROLE_GRANTS.user),
  admin: authAccessControl.newRole(ROLE_GRANTS.admin),
};

export function createAuthFeatures(
  prisma: PrismaService,
  authConfiguration: ConfigType<typeof authConfig>,
  appConfiguration: ConfigType<typeof appConfig>,
  httpConfiguration: ConfigType<typeof httpConfig>,
  emailHooks: BetterAuthEmailHooks,
  logger: BetterAuthLogger,
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

  return {
    baseURL: authUrl.origin,
    basePath,
    secret: betterAuthSecret,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),

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
}

export function createBetterAuth(
  ...dependencies: Parameters<typeof createAuthFeatures>
) {
  const authFeatures = createAuthFeatures(...dependencies);
  return betterAuth(authFeatures);
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;
