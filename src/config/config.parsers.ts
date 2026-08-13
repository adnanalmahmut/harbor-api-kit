import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from '#src/common/constants/locales.js';
import { z } from 'zod';

export const supportedLocaleSchema = z.enum(SUPPORTED_LOCALES);
export const defaultLocale = DEFAULT_LOCALE;

export const isOrigin = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.origin === value;
  } catch {
    return false;
  }
};

export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export const withTrailingSlash = (origin: string): string =>
  origin.endsWith('/') ? origin : `${origin}/`;

export const trustProxySchema = z.preprocess(
  (value) => {
    if (typeof value === 'boolean' || typeof value === 'number') return value;

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
      if (/^\d+$/.test(normalized)) return Number(normalized);
    }

    return value;
  },
  z.union([z.boolean(), z.number().int().min(0)]),
);

export const envBoolean = (defaultValue: boolean) =>
  z
    .preprocess((value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
      }
      return value;
    }, z.boolean())
    .default(defaultValue);
