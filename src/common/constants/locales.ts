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

const SUPPORTED_LOCALE_BY_TAG = new Map(
  SUPPORTED_LOCALES.map((locale) => [locale.toLowerCase(), locale]),
);
const SUPPORTED_LOCALE_FALLBACKS = buildI18nFallbacks(SUPPORTED_LOCALES);

export function resolveSupportedLocale(
  locale?: string,
): SupportedLocale | undefined {
  const raw = locale?.trim();
  if (!raw) return undefined;

  const exact = SUPPORTED_LOCALE_BY_TAG.get(raw.toLowerCase());
  if (exact) return exact;

  const lang = getLang(raw);
  return (
    SUPPORTED_LOCALE_FALLBACKS[`${lang}-*`] ?? SUPPORTED_LOCALE_FALLBACKS[lang]
  );
}
