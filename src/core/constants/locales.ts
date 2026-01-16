export const SUPPORTED_LOCALES = ['en-US', 'ar-SY'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = SUPPORTED_LOCALES[0];
