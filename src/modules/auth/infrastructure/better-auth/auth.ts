import type { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { getRequestContext } from '#src/infrastructure/context/request-context.manager.js';
import type { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { AuthEmailHooks } from '#src/modules/auth/infrastructure/better-auth/hooks/auth-email.hooks.js';
import { Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

export type BetterAuthInstance = ReturnType<typeof betterAuth>;

export function createBetterAuth(
  prisma: PrismaService,
  config: AppConfigService,
  emailHooks: AuthEmailHooks,
): BetterAuthInstance {
  const logger = new Logger('BetterAuth');
  const {
    sessionTokenCookie,
    sessionDataCookie,
    betterAuthSecret,
    betterAuthUrl,
  } = config.auth();

  const isProd = config.isProd();
  const trustedOrigins = config.cors().trustedOrigins;
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
          return prisma.user.update({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ args, query }) {
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
          return prisma.account.update({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ args, query }) {
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
      async sendResetPassword(data: any) {
        // data usually contains { user, url, token }
        const ctx = getRequestContext();
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
        const ctx = getRequestContext();
        if (ctx) {
          await emailHooks.sendVerificationEmail(params, ctx);
        } else {
          logger.error('Missing RequestContext in sendVerificationEmail hook');
        }
      },
    },

    advanced: {
      cookiePrefix: isProd ? 'core' : 'core-dev',
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

    session: { modelName: 'Session', storeSessionInDatabase: true },
    account: { modelName: 'Account' },
    verification: { modelName: 'Verification' },
    socialProviders: {
      google: {
        clientId: config.auth().google.clientId || '',
        clientSecret: config.auth().google.clientSecret || '',
        enabled: !!config.auth().google.clientId,
      },
      github: {
        clientId: config.auth().github.clientId || '',
        clientSecret: config.auth().github.clientSecret || '',
        enabled: !!config.auth().github.clientId,
      },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const DEFAULT_ROLE_SLUG = 'user';

            try {
              // 1. Assign default role
              const role = await prisma.role.findUnique({
                where: { slug: DEFAULT_ROLE_SLUG },
              });
              if (role) {
                await prisma.userRole.create({
                  data: {
                    userId: user.id,
                    roleId: role.id,
                  },
                });
                logger.log(
                  `Assigned default role '${DEFAULT_ROLE_SLUG}' to user ${user.id}`,
                );
              }

              // 2. Extract firstName/lastName from name (for social auth)
              if (user.name && (!user.firstName || !user.lastName)) {
                const nameParts = user.name.trim().split(/\s+/);
                const firstName = nameParts[0] || null;
                const lastName = nameParts.slice(1).join(' ') || null;

                if (firstName || lastName) {
                  await prisma.user.update({
                    where: { id: user.id },
                    data: { firstName, lastName },
                  });
                  logger.log(
                    `Extracted name parts for user ${user.id}: ${firstName} ${lastName}`,
                  );
                }
              }
            } catch (err) {
              logger.error(`Failed post-create hook for user ${user.id}`, err);
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
