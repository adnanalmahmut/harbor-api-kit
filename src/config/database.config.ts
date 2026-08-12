import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => /^(postgresql|postgres):\/\//.test(value), {
      message: 'must start with postgresql:// or postgres://',
    }),
});

export const parseDatabaseConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);
  return { url: env.DATABASE_URL };
};

export default registerAs('database', parseDatabaseConfig);
