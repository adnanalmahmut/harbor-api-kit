import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  REDIS_URL: z
    .string()
    .min(1)
    .refine((value) => /^rediss?:\/\//.test(value), {
      message: 'must start with redis:// or rediss://',
    }),
  REDIS_PREFIX: z.string().default('hak'),
  REDIS_DEFAULT_TTL_SEC: z.coerce.number().int().min(1).default(900),
});

export const parseRedisConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);

  return {
    url: env.REDIS_URL,
    prefix: env.REDIS_PREFIX,
    defaultTtlSec: env.REDIS_DEFAULT_TTL_SEC,
  };
};

export default registerAs('redis', parseRedisConfig);
