export const SUPPORTED_LOCALES = ['en-US', 'ar-SY'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

type FallbacksMap = Record<string, SupportedLocale>;

function getLang(locale: string) {
  return locale.split('-')[0].toLowerCase();
}

export function buildI18nFallbacks(
  supported: readonly SupportedLocale[],
): FallbacksMap {
  const canonicalByLang = new Map<string, SupportedLocale>();
  for (const loc of supported) {
    const lang = getLang(loc);
    if (!canonicalByLang.has(lang)) canonicalByLang.set(lang, loc);
  }

  const fallbacks: FallbacksMap = {};
  for (const [lang, canonical] of canonicalByLang.entries()) {
    fallbacks[lang] = canonical;
    fallbacks[`${lang}-*`] = canonical;
  }

  return fallbacks;
}
