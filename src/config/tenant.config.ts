import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { envBoolean } from './config.parsers.js';

const schema = z.object({
  TENANT_STRATEGY: z.enum(['subdomain', 'header']).default('subdomain'),
  TENANT_REQUIRED: envBoolean(true),
  TENANT_HEADER_NAME: z.string().min(1).default('X-Tenant'),
});

export const parseTenantConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);

  return {
    strategy: env.TENANT_STRATEGY,
    required: env.TENANT_REQUIRED,
    headerName: env.TENANT_HEADER_NAME.toLowerCase(),
  };
};

export default registerAs('tenant', parseTenantConfig);
