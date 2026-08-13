import { SUPPORTED_LOCALES, type SupportedLocale } from '#src/config/index.js';
import type { ValidationIssue } from '#src/common/app-exception.js';
import { isI18nKeyLike, normalizeHeader } from '#src/common/utils.js';
import type { I18nService } from 'nestjs-i18n';

type FallbacksMap = Record<string, SupportedLocale>;

function getLang(locale: string) {
  return locale.split('-')[0].toLowerCase();
}

/**
 * Maps every bare language and wildcard region (`ar`, `ar-*`) onto the first
 * supported locale for that language, which is the shape nestjs-i18n expects.
 */
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

/** `ar-EG` → `ar-SY`, `en` → `en-US`, `fr` → undefined. */
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

type LocaleSource = {
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

function firstLanguageTag(raw: string): string {
  return raw.split(',')[0].split(';')[0].trim();
}

/**
 * Reads a locale off a request-shaped object: the query parameter wins, then
 * the configured header, then `Accept-Language` when the caller opts in.
 */
export function resolveLocaleFromSource(
  src: LocaleSource,
  headerName: string,
  queryName: string,
  opts?: { includeAcceptLanguage?: boolean },
): string | undefined {
  const headers = src.headers ?? {};
  const query = src.query ?? {};

  const q = query[queryName] as any;
  const h = headers[String(headerName).toLowerCase()] as any;

  // only if enabled (default: true to keep backward compatibility)
  const includeAL = opts?.includeAcceptLanguage !== false;
  const a = includeAL ? (headers['accept-language'] as any) : undefined;

  const raw = normalizeHeader(q) ?? normalizeHeader(h) ?? normalizeHeader(a);
  if (!raw) return undefined;

  const tag = firstLanguageTag(raw);
  return resolveSupportedLocale(tag);
}

function toSafeString(value: unknown): string {
  if (value == null) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (value instanceof Error) return value.message;

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function normalizeFieldPath(path: unknown): string {
  if (Array.isArray(path)) return path.map(toSafeString).join('.');
  return toSafeString(path);
}

/**
 * Translates a value only when it looks like an i18n key, so already-resolved
 * messages pass through untouched.
 */
export function translateIfKey(
  i18n: I18nService,
  value: unknown,
  locale?: string,
  args?: Record<string, any>,
): Promise<string> {
  const key = toSafeString(value);

  if (!isI18nKeyLike(key)) return Promise.resolve(key);

  try {
    const translated = i18n.translate(key, { lang: locale, args });
    return Promise.resolve(toSafeString(translated));
  } catch {
    return Promise.resolve(key);
  }
}

export async function mapValidationIssuesToApi(
  issues: unknown,
  t: (value: unknown) => Promise<string>,
): Promise<ValidationIssue[]> {
  if (!Array.isArray(issues)) return [];

  const safeIssues = issues as ValidationIssue[];

  const cache = new Map<string, Promise<string>>();
  const translateCached = (v: unknown) => {
    const key = toSafeString(v);
    if (!cache.has(key)) cache.set(key, t(v));
    return cache.get(key)!;
  };

  return Promise.all(
    safeIssues.map(async (i) => ({
      path: normalizeFieldPath(i?.path),
      message: await translateCached(i?.message),
    })),
  );
}
