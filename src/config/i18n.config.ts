import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { defaultLocale, supportedLocaleSchema } from './config.parsers.js';

const schema = z.object({
  I18N_HEADER_NAME: z.string().min(1).default('Accept-Language'),
  I18N_QUERY_NAME: z.string().min(1).default('lang'),
  I18N_DEFAULT_LOCALE: supportedLocaleSchema.default(defaultLocale),
});

export const parseI18nConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);

  return {
    defaultLocale: env.I18N_DEFAULT_LOCALE,
    headerName: env.I18N_HEADER_NAME.toLowerCase(),
    queryName: env.I18N_QUERY_NAME.toLowerCase(),
  };
};

export default registerAs('i18n', parseI18nConfig);
