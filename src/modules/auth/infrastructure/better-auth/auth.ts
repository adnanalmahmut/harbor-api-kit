import { appConfig, authConfig, httpConfig } from '#src/config/index.js';
import {
  getRequestContextStatic,
  type PrismaService,
} from '#src/core/index.js';
import {
  ADMIN_ROLES,
  AUTHORIZATION_STATEMENTS,
  DEFAULT_ROLE,
  ROLE_GRANTS,
} from '#src/modules/authorization/index.js';
import {
  composeUserName,
  normalizeUserNamePart,
  splitUserName,
} from '#src/modules/users/index.js';
import type { ConfigType } from '@nestjs/config';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAccessControl } from 'better-auth/plugins/access';
import { admin, openAPI, organization } from 'better-auth/plugins';

export type BetterAuthEmailHooks = {
  sendResetPasswordEmail(
    data: { user: any; url: string; token: string },
    context: Parameters<
      import('./hooks/auth-email.hooks.js').AuthEmailHooks['sendResetPasswordEmail']
    >[1],
  ): Promise<void>;
  sendVerificationEmail(
    data: { user: any; token: string },
    context: Parameters<
      import('./hooks/auth-email.hooks.js').AuthEmailHooks['sendVerificationEmail']
    >[1],
  ): Promise<void>;
};

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

  const prismaWithSoftDelete = prisma.$extends({
    query: {
      user: {
        async findUnique({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findMany({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async delete({ args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _query = query;
          return prisma.user.update({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _query = query;
          return prisma.user.updateMany({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
      },

      account: {
        async findUnique({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findMany({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async delete({ args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _query = query;
          return prisma.account.update({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _query = query;
          return prisma.account.updateMany({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
      },
      // Session: default behavior (Hard Delete) is desired.
    },
  });

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
    // Cast to any because adapter types might not fully align with extended client types perfectly
    database: prismaAdapter(prismaWithSoftDelete as any, {
      provider: 'postgresql',
    }),

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
        '/forget-password': { window: 60, max: 3 },
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      async sendResetPassword(data: { user: any; url: string; token: string }) {
        const ctx = getRequestContextStatic();
        if (ctx) {
          await emailHooks.sendResetPasswordEmail(data, ctx);
        } else {
          logger.error('Missing RequestContext in sendResetPassword hook');
        }
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 86400, // 24 hours
      sendVerificationEmail: async (params) => {
        const ctx = getRequestContextStatic();
        if (ctx) {
          await emailHooks.sendVerificationEmail(params, ctx);
        } else {
          logger.error('Missing RequestContext in sendVerificationEmail hook');
        }
      },
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
      },
      deleteUser: {
        enabled: true,
      },
      additionalFields: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
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
      user: {
        create: {
          before: (user) => {
            const fallback = splitUserName(user.name);
            const firstName = normalizeUserNamePart(
              typeof user.firstName === 'string'
                ? user.firstName
                : fallback.firstName,
            );
            const lastName = normalizeUserNamePart(
              typeof user.lastName === 'string'
                ? user.lastName
                : fallback.lastName,
            );

            return Promise.resolve({
              data: {
                ...user,
                firstName,
                lastName,
                name: composeUserName(firstName, lastName),
              },
            });
          },
        },
        update: {
          after: async (user) => {
            const firstName =
              typeof user.firstName === 'string' ? user.firstName : '';
            const lastName =
              typeof user.lastName === 'string' ? user.lastName : '';
            const name = composeUserName(firstName, lastName);
            if (name && user.name !== name) {
              await prisma.user.update({
                where: { id: user.id },
                data: { name },
              });
            }
          },
        },
      },

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
