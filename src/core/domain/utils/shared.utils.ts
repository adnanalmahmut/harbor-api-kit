import {
  buildI18nFallbacks,
  SUPPORTED_LOCALES,
} from '#src/core/domain/constants/locales.js';

export function stripQuery(url: string | undefined): string {
  const u = url ?? '/';
  const i = u.indexOf('?');
  return i === -1 ? u : u.slice(0, i);
}

export function extractClientIp(xff?: string | string[]): string | undefined {
  if (!xff) return undefined;
  const val = Array.isArray(xff) ? xff[0] : xff;
  return val.split(',')[0]?.trim() || undefined;
}

export function normalizeHeader(value: unknown): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value))
    return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

export function isI18nKeyLike(s: any): s is string {
  if (typeof s !== 'string') return false;
  const v = s.trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;
  return v.includes('.') && /^[a-zA-Z0-9_.:-]+$/.test(v);
}

type LocaleSource = {
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

function firstLanguageTag(raw: string): string {
  return raw.split(',')[0].split(';')[0].trim();
}

export function resolveLocaleFromSource(
  src: LocaleSource,
  headerName: string,
  queryName: string,
): string | undefined {
  const headers = src.headers ?? {};
  const query = src.query ?? {};

  const q = query[queryName] as any;
  const h = headers[String(headerName).toLowerCase()] as any;
  const a = headers['accept-language'] as any;

  const raw = normalizeHeader(q) ?? normalizeHeader(h) ?? normalizeHeader(a);
  if (!raw) return undefined;

  const tag = firstLanguageTag(raw);
  return isKnownLocale(tag) ? tag : undefined;
}

const KNOWN_LOCALES: Set<string> = new Set([
  ...SUPPORTED_LOCALES,
  ...Object.keys(buildI18nFallbacks(SUPPORTED_LOCALES)),
]);

function isKnownLocale(tag: string): boolean {
  if (KNOWN_LOCALES.has(tag)) return true;
  // Check wildcard patterns like 'en-*' by matching the language prefix
  const lang = tag.split('-')[0].toLowerCase();
  return KNOWN_LOCALES.has(lang) || KNOWN_LOCALES.has(`${lang}-*`);
}
