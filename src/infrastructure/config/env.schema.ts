import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from '#src/core/constants/locales.js';
import { AppException } from '#src/core/exceptions/app-exception.js';
import { z } from 'zod';

const supported = z.enum(SUPPORTED_LOCALES);

const isOrigin = (v: string) => {
  try {
    const u = new URL(v);
    return u.origin === v;
  } catch {
    return false;
  }
};

const toStrArray = (v: unknown) => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const trustProxySchema = z.preprocess(
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

export const envSchema = z.object({
  APP_NAME: z.string().min(1).default('Core Platform API'),
  APP_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  ENABLE_DOCS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  COOKIE_ACCESS_NAME: z.string().min(1).default('__Host-access'),
  COOKIE_REFRESH_NAME: z.string().min(1).default('__Host-refresh'),

  REQUEST_ID_HEADER_NAME: z.string().min(1).default('x-request-id'),

  I18N_HEADER_NAME: z.string().min(1).default('Accept-Language'),
  I18N_QUERY_NAME: z.string().min(1).default('lang'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  LOG_PRETTY: z.coerce.boolean().default(false),

  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => /^(postgresql|postgres):\/\//.test(v), {
      message: 'DATABASE_URL must start with postgresql:// or postgres://',
    }),

  RESEND_API_KEY: z.string().min(1),

  I18N_DEFAULT_LOCALE: supported.default(DEFAULT_LOCALE),

  CORS_TRUSTED_ORIGINS: z
    .preprocess(toStrArray, z.array(z.string().min(1)))
    .refine((arr) => arr.every((o) => isOrigin(o)), {
      message:
        'CORS_TRUSTED_ORIGINS must contain valid origins like https://app.example.com (no paths)',
    })
    .default([]),

  FASTIFY_TRUST_PROXY: trustProxySchema.default(true),

  REDIS_URL: z
    .string()
    .min(1)
    .refine((v) => /^rediss?:\/\//.test(v), {
      message: 'REDIS_URL must start with redis:// or rediss://',
    }),

  REDIS_PREFIX: z.string().default('saas-core-platform-api:'),
  REDIS_DEFAULT_TTL_SEC: z.coerce.number().int().min(1).default(900),

  CSRF_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  CSRF_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  CSRF_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  COOKIE_CSRF_NAME: z.string().min(1).default('__Host-csrf'),

  CSRF_HEADER_NAME: z.string().min(1).default('X-CSRF-Token'),

  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  RATE_LIMIT_POINTS: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_DURATION_SEC: z.coerce.number().int().min(1).default(60),

  RATE_LIMIT_KEY_STRATEGY: z.enum(['ip', 'userId', 'sid']).default('ip'),

  RATE_LIMIT_HEADER_PREFIX: z.string().min(1).default('RateLimit'),

  TENANT_STRATEGY: z.enum(['subdomain', 'header']).default('subdomain'),
  TENANT_REQUIRED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  TENANT_HEADER_NAME: z.string().min(1).default('X-Tenant'),
});

export type EnvVars = z.infer<typeof envSchema>;

const SENSITIVE_KEY_REGEX =
  /(PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL|REDIS_URL|PRIVATE|CERT|CREDENTIAL|ACCESS)/i;

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const failedKeys = Array.from(
      new Set(parsed.error.issues.map((i) => i.path[0]).filter(Boolean)),
    ) as string[];

    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');

    // Debug آمن: مفاتيح فقط + type (بدون قيم)
    const debug = failedKeys
      .map((k) => {
        const raw = (config as any)[k];
        const isSensitive = SENSITIVE_KEY_REGEX.test(String(k));
        const type =
          raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw;
        return `${k} (type=${type}${isSensitive ? ', sensitive' : ''})`;
      })
      .join('\n');

    throw AppException.validationError({
      field: 'env',
      message: `Invalid environment variables:\n${issues}\n\nDebug:\n${debug}`,
    });
  }

  const d = parsed.data;

  if (
    d.APP_ENV === 'production' &&
    d.CSRF_ENABLED === true &&
    d.CORS_TRUSTED_ORIGINS.length === 0
  ) {
    throw AppException.validationError({
      field: 'CORS_TRUSTED_ORIGINS',
      message: 'CORS_TRUSTED_ORIGINS must be configured in production',
    });
  }

  return d;
}
