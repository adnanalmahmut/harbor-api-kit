export function isI18nKeyLike(s: string): boolean {
  const v = s.trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;
  return v.includes('.') && /^[a-zA-Z0-9_.:-]+$/.test(v);
}

export function normalizeHeader(value: unknown): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value))
    return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

type LocaleSource = {
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

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

  return normalizeHeader(q) ?? normalizeHeader(h) ?? normalizeHeader(a);
}
