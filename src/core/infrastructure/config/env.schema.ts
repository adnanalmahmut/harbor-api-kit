import { z } from 'zod';
import {
  DEFAULT_LOCALE_VALUE,
  envBool,
  isOrigin,
  supported,
  toStrArray,
  trustProxySchema,
} from './env.parsers.js';

export const envSchema = z
  .object({
    // App Core
    APP_NAME: z.string().trim().min(1).default('API'),
    APP_ENV: z
      .enum(['development', 'test', 'staging', 'production'])
      .default('development'),
    APP_PORT: z.coerce.number().int().min(1).max(65535).default(5000),

    // Public URLs (Canonical)
    APP_PUBLIC_URL: z.url(),
    FRONTEND_PUBLIC_URL: z.url(),

    // CORS + Redirect Allowlists
    WEB_ALLOWED_ORIGINS: z
      .preprocess(toStrArray, z.array(z.string().min(1)))
      .refine((arr) => arr.every((o) => isOrigin(o)), {
        message:
          'WEB_ALLOWED_ORIGINS must contain valid origins like https://app.example.com (no paths)',
      })
      .default([]),
    REDIRECT_ALLOWED_ORIGINS: z
      .preprocess(toStrArray, z.array(z.string().min(1)))
      .refine((arr) => arr.every((o) => isOrigin(o)), {
        message:
          'REDIRECT_ALLOWED_ORIGINS must contain valid origins like https://app.example.com (no paths)',
      })
      .default([]),

    // HTTP Server / Proxy
    FASTIFY_TRUST_PROXY: trustProxySchema.default(1),

    // Cookies
    COOKIE_ALLOWED_DOMAINS: z
      .preprocess(toStrArray, z.array(z.string().min(1)))
      .default([]),

    // Docs
    ENABLE_DOCS: envBool(false),

    // Logging & Request Tracing
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    LOG_PRETTY: envBool(false),
    REQUEST_ID_HEADER_NAME: z.string().min(1).default('x-request-id'),

    // Internationalization (i18n)
    I18N_HEADER_NAME: z.string().min(1).default('Accept-Language'),
    I18N_QUERY_NAME: z.string().min(1).default('lang'),
    I18N_DEFAULT_LOCALE: supported.default(DEFAULT_LOCALE_VALUE),

    // Database (App)
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((v) => /^(postgresql|postgres):\/\//.test(v), {
        message: 'DATABASE_URL must start with postgresql:// or postgres://',
      }),

    // Cache / Queue (Redis)
    REDIS_URL: z
      .string()
      .min(1)
      .refine((v) => /^rediss?:\/\//.test(v), {
        message: 'REDIS_URL must start with redis:// or rediss://',
      }),
    REDIS_PREFIX: z.string().default('scp'),
    REDIS_DEFAULT_TTL_SEC: z.coerce.number().int().min(1).default(900),

    // Security - CSRF
    CSRF_ENABLED: envBool(true),
    CSRF_HEADER_NAME: z.string().min(1).default('X-CSRF-Token'),
    COOKIE_CSRF_NAME: z.string().min(1).default('__Host-csrf'),
    CSRF_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    CSRF_COOKIE_SECURE: envBool(true),

    // Security - Rate Limiting
    RATE_LIMIT_ENABLED: envBool(true),
    RATE_LIMIT_POINTS: z.coerce.number().int().min(1).default(60),
    RATE_LIMIT_DURATION_SEC: z.coerce.number().int().min(1).default(60),
    RATE_LIMIT_KEY_STRATEGY: z.enum(['ip', 'userId', 'sid']).default('ip'),
    RATE_LIMIT_HEADER_PREFIX: z.string().min(1).default('RateLimit'),

    // Authentication - Session Cookies
    SESSION_TOKEN_COOKIE: z.string().min(1).default('__Host-session'),
    SESSION_DATA_COOKIE: z.string().min(1).default('__Host-session-data'),
    AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC: z.coerce
      .number()
      .int()
      .min(1)
      .default(60 * 60 * 24 * 30),
    AUTH_SESSION_ROLLING_UPDATE_AGE_SEC: z.coerce
      .number()
      .int()
      .min(0)
      .default(60 * 60 * 24),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),

    // OAuth Providers
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    // Email Service (Resend)
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.email(),
    RESEND_FROM_NAME: z.string().trim().min(1),

    // Notifications - Retry Policy
    NOTIFY_EMAIL_RETRY_ATTEMPTS: z.coerce.number().int().min(0).default(5),
    NOTIFY_EMAIL_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(5000),

    // Tenant
    TENANT_STRATEGY: z.enum(['subdomain', 'header']).default('subdomain'),
    TENANT_REQUIRED: envBool(true),
    TENANT_HEADER_NAME: z.string().min(1).default('X-Tenant'),

    // Storage
    STORAGE_DRIVER: z
      .enum(['s3', 'r2', 'spaces', 'gcs', 'local'])
      .default('local'),

    // S3 / R2 / Spaces
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET: z.string().optional(),

    // GCS
    GCS_PROJECT_ID: z.string().optional(),
    GCS_KEY_FILE: z.string().optional(),
    GCS_BUCKET: z.string().optional(),

    // Local
    LOCAL_STORAGE_PATH: z.string().default('./uploads'),
  })
  .superRefine((data, ctx) => {
    // 1. S3 Compatible (AWS S3, Cloudflare R2, DigitalOcean Spaces)
    if (['s3', 'r2', 'spaces'].includes(data.STORAGE_DRIVER)) {
      if (!data.S3_BUCKET) {
        ctx.addIssue({
          code: 'custom',
          path: ['S3_BUCKET'],
          message:
            'S3_BUCKET is required when STORAGE_DRIVER is s3, r2, or spaces',
        });
      }
      if (!data.S3_ACCESS_KEY_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['S3_ACCESS_KEY_ID'],
          message:
            'S3_ACCESS_KEY_ID is required when STORAGE_DRIVER is s3, r2, or spaces',
        });
      }
      if (!data.S3_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['S3_SECRET_ACCESS_KEY'],
          message:
            'S3_SECRET_ACCESS_KEY is required when STORAGE_DRIVER is s3, r2, or spaces',
        });
      }
      if (!data.S3_REGION) {
        ctx.addIssue({
          code: 'custom',
          path: ['S3_REGION'],
          message:
            'S3_REGION is required when STORAGE_DRIVER is s3, r2, or spaces',
        });
      }

      // Endpoint is mandatory for R2 and Spaces, optional for AWS S3
      if (['r2', 'spaces'].includes(data.STORAGE_DRIVER) && !data.S3_ENDPOINT) {
        ctx.addIssue({
          code: 'custom',
          path: ['S3_ENDPOINT'],
          message:
            'S3_ENDPOINT is required when STORAGE_DRIVER is r2 or spaces',
        });
      }
    }

    // 2. Google Cloud Storage
    if (data.STORAGE_DRIVER === 'gcs') {
      if (!data.GCS_PROJECT_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['GCS_PROJECT_ID'],
          message: 'GCS_PROJECT_ID is required when STORAGE_DRIVER is gcs',
        });
      }
      if (!data.GCS_BUCKET) {
        ctx.addIssue({
          code: 'custom',
          path: ['GCS_BUCKET'],
          message: 'GCS_BUCKET is required when STORAGE_DRIVER is gcs',
        });
      }
    }

    // 3. Local Storage
    if (data.STORAGE_DRIVER === 'local') {
      if (!data.LOCAL_STORAGE_PATH) {
        ctx.addIssue({
          code: 'custom',
          path: ['LOCAL_STORAGE_PATH'],
          message:
            'LOCAL_STORAGE_PATH is required when STORAGE_DRIVER is local',
        });
      }
    }

    if (
      data.AUTH_SESSION_ROLLING_UPDATE_AGE_SEC >=
      data.AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_SESSION_ROLLING_UPDATE_AGE_SEC'],
        message:
          'AUTH_SESSION_ROLLING_UPDATE_AGE_SEC must be less than AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC',
      });
    }
  });

export type EnvVars = z.infer<typeof envSchema>;
