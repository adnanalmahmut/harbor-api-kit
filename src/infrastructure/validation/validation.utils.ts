import type { ValidationIssue } from '#src/core/types/api.types.js';
import { isI18nKeyLike } from '#src/infrastructure/i18n/i18n-helpers.js';
import type { I18nService } from 'nestjs-i18n';

export function normalizeFieldPath(path: unknown): string {
  if (Array.isArray(path)) return path.map(String).join('.');
  if (typeof path === 'string') return path;
  if (path == null) return '';
  return String(path);
}

export async function translateIfKey(
  i18n: I18nService,
  value: unknown,
  locale?: string,
): Promise<string> {
  const key = String(value ?? '');

  if (!isI18nKeyLike(key)) return key;

  try {
    return String(await i18n.translate(key, { lang: locale }));
  } catch {
    return key;
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
    const key = String(v ?? '');
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
