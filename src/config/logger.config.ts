import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { envBoolean } from './config.parsers.js';

const schema = z.object({
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  LOG_PRETTY: envBoolean(false),
});

export const parseLoggerConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);
  return { level: env.LOG_LEVEL, pretty: env.LOG_PRETTY };
};

export default registerAs('logger', parseLoggerConfig);
