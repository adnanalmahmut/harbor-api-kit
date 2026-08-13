import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * The locale catalogue. It lives here because it is what the environment is
 * validated against — `I18N_DEFAULT_LOCALE` must be one of these. The i18n
 * capability imports it; nothing else needs to know the list.
 */
export const SUPPORTED_LOCALES = ['en-US', 'ar-SY'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

const schema = z.object({
  I18N_HEADER_NAME: z.string().min(1).default('Accept-Language'),
  I18N_QUERY_NAME: z.string().min(1).default('lang'),
  I18N_DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE),
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
