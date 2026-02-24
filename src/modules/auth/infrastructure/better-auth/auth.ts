import {
  AppConfigService,
  getRequestContextStatic,
  type PrismaService,
} from '#src/core/index.js';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PinoLogger } from 'nestjs-pino';
import type { AuthEmailHooks } from './hooks/auth-email.hooks.js';

export type BetterAuthInstance = ReturnType<typeof betterAuth>;

export function createBetterAuth(
  prisma: PrismaService,
  config: AppConfigService,
  emailHooks: AuthEmailHooks,
  logger: PinoLogger,
): BetterAuthInstance {
  const {
    sessionTokenCookie,
    sessionDataCookie,
    betterAuthSecret,
    betterAuthUrl,
  } = config.auth();

  const isProd = config.isProd();
  const trustedOrigins = config.cors().originAllowlist;
  const COOKIE_DOMAIN = isProd ? getCookieDomain(trustedOrigins[0]) : undefined;

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

  return betterAuth({
    baseURL: betterAuthUrl,
    secret: betterAuthSecret,
    // Cast to any because adapter types might not fully align with extended client types perfectly
    database: prismaAdapter(prismaWithSoftDelete as any, {
      provider: 'postgresql',
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      async sendResetPassword(data: { user: any; url: string; token: string }) {
        // data usually contains { user, url, token }
        const ctx = getRequestContextStatic();
        if (ctx) {
          await emailHooks.sendResetPasswordEmail(data, ctx);
        } else {
          // If no context (e.g. background job?), we log error.
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
      // Headers to check for real client IP (in order of priority)
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
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
        firstName: { type: 'string', required: false },
        lastName: { type: 'string', required: false },
        locale: { type: 'string', required: false },
        roles: { type: 'string', required: false },
        permissions: { type: 'string', required: false },
      },
    },

    session: {
      modelName: 'Session',
      storeSessionInDatabase: true,
      additionalFields: {
        city: { type: 'string', required: false },
        country: { type: 'string', required: false },
      },
    },
    account: { modelName: 'Account' },
    verification: { modelName: 'Verification' },
    socialProviders: {
      google: {
        clientId: config.auth().providers.google.clientId || '',
        clientSecret: config.auth().providers.google.clientSecret || '',
        enabled: !!config.auth().providers.google.clientId,
      },
      github: {
        clientId: config.auth().providers.github.clientId || '',
        clientSecret: config.auth().providers.github.clientSecret || '',
        enabled: !!config.auth().providers.github.clientId,
      },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              // Extract firstName/lastName from name (for social auth)
              if (user.name && (!user.firstName || !user.lastName)) {
                const nameParts = user.name.trim().split(/\s+/);
                const firstName = nameParts[0] || null;
                const lastName = nameParts.slice(1).join(' ') || null;

                if (firstName || lastName) {
                  await prisma.user.update({
                    where: { id: user.id },
                    data: { firstName, lastName },
                  });

                  logger.info(
                    `Extracted name parts for user ${user.id}: ${firstName} ${lastName}`,
                  );
                }
              }
            } catch (err) {
              logger.error(err, `Failed post-create hook for user ${user.id}`);
            }
          },
        },
      },

      session: {
        create: {
          after: async (session) => {
            // Populate city and country from IP geolocation
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
                    `Session ${session.id}: geo ${geo.city}, ${geo.country}`,
                  );
                }
              } catch (err) {
                logger.warn(
                  err,
                  `Geolocation failed for session ${session.id}`,
                );
              }
            }
          },
        },
      },
    },
  });
}

function getCookieDomain(origin?: string): string | undefined {
  if (!origin) return undefined;
  try {
    const u = new URL(origin);
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return undefined;
    return `.${host}`;
  } catch {
    return undefined;
  }
}
