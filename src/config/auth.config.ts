import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z
  .object({
    SESSION_TOKEN_COOKIE: z.string().min(1).default('__Host-session'),
    SESSION_DATA_COOKIE: z.string().min(1).default('__Host-session-data'),
    AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC: z.coerce
      .number()
      .int()
      .min(1)
      .default(60 * 60 * 24 * 30),
    AUTH_SESSION_ROLLING_UPDATE_AGE_SEC: z.coerce
      .number()
      .int()
      .min(0)
      .default(60 * 60 * 24),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
  })
  .superRefine((environment, context) => {
    if (
      environment.AUTH_SESSION_ROLLING_UPDATE_AGE_SEC >=
      environment.AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_SESSION_ROLLING_UPDATE_AGE_SEC'],
        message: 'must be less than AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC',
      });
    }
  });

export const parseAuthConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);

  return {
    sessionTokenCookie: env.SESSION_TOKEN_COOKIE,
    sessionDataCookie: env.SESSION_DATA_COOKIE,
    session: {
      persistentExpiresInSec: env.AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC,
      rollingUpdateAgeSec: env.AUTH_SESSION_ROLLING_UPDATE_AGE_SEC,
    },
    betterAuthUrl: env.BETTER_AUTH_URL,
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    providers: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
  };
};

export default registerAs('auth', parseAuthConfig);
