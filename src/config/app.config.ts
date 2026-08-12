import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z
  .object({
    APP_NAME: z.string().trim().min(1).default('API'),
    APP_ENV: z
      .enum(['development', 'test', 'staging', 'production'])
      .default('development'),
    APP_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    APP_PUBLIC_URL: z.url(),
    FRONTEND_PUBLIC_URL: z.url(),
  })
  .superRefine((environment, context) => {
    if (environment.APP_ENV !== 'production') return;

    if (!environment.APP_PUBLIC_URL.startsWith('https://')) {
      context.addIssue({
        code: 'custom',
        path: ['APP_PUBLIC_URL'],
        message: 'APP_PUBLIC_URL must use https:// in production',
      });
    }

    if (!environment.FRONTEND_PUBLIC_URL.startsWith('https://')) {
      context.addIssue({
        code: 'custom',
        path: ['FRONTEND_PUBLIC_URL'],
        message: 'FRONTEND_PUBLIC_URL must use https:// in production',
      });
    }
  });

export const parseAppConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);

  return {
    name: env.APP_NAME,
    env: env.APP_ENV,
    port: env.APP_PORT,
    publicUrl: env.APP_PUBLIC_URL,
    frontendPublicUrl: env.FRONTEND_PUBLIC_URL,
    isProduction: env.APP_ENV === 'production',
  };
};

export default registerAs('app', parseAppConfig);
