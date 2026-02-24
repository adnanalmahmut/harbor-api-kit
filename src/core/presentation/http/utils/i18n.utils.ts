import { isI18nKeyLike, type ValidationIssue } from '#src/core/domain/index.js';
import type { I18nService } from 'nestjs-i18n';

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
