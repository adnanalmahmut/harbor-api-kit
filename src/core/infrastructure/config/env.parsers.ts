import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '#src/core/domain/index.js';
import z from 'zod';

export const supported = z.enum(SUPPORTED_LOCALES);

export const isOrigin = (v: string) => {
  try {
    const u = new URL(v);
    return u.origin === v;
  } catch {
    return false;
  }
};

export const toStrArray = (v: unknown) => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

export const trustProxySchema = z.preprocess(
  (v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v;

    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
      if (/^\d+$/.test(s)) return Number(s);
    }

    return v;
  },
  z.union([z.boolean(), z.number().int().min(0)]),
);

export const envBool = (def: boolean) =>
  z
    .preprocess((v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === 'true') return true;
        if (s === 'false') return false;
        return v;
      }
      return v;
    }, z.boolean())
    .default(def);

export const DEFAULT_LOCALE_VALUE = DEFAULT_LOCALE;
