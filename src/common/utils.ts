export function stripQuery(url: string | undefined): string {
  const u = url ?? '/';
  const i = u.indexOf('?');
  return i === -1 ? u : u.slice(0, i);
}

export function normalizeHeader(value: unknown): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value))
    return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Distinguishes an i18n key from a human-readable message, so already-resolved
 * text is never fed back through the translator.
 */
export function isI18nKeyLike(s: any): s is string {
  if (typeof s !== 'string') return false;
  const v = s.trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;
  return v.includes('.') && /^[a-zA-Z0-9_.:-]+$/.test(v);
}
