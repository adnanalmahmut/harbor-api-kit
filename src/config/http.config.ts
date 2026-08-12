import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import {
  envBoolean,
  isOrigin,
  toStringArray,
  trustProxySchema,
  unique,
  withTrailingSlash,
} from './config.parsers.js';

const originListSchema = z
  .preprocess(toStringArray, z.array(z.string().min(1)))
  .refine((origins) => origins.every(isOrigin), {
    message: 'must contain valid origins without paths',
  })
  .default([]);

const schema = z
  .object({
    APP_ENV: z
      .enum(['development', 'test', 'staging', 'production'])
      .default('development'),
    WEB_ALLOWED_ORIGINS: originListSchema,
    REDIRECT_ALLOWED_ORIGINS: originListSchema,
    FASTIFY_TRUST_PROXY: trustProxySchema.default(1),
    COOKIE_ALLOWED_DOMAINS: z
      .preprocess(toStringArray, z.array(z.string().min(1)))
      .default([]),
    SESSION_TOKEN_COOKIE: z.string().min(1).default('__Host-session'),
    SESSION_DATA_COOKIE: z.string().min(1).default('__Host-session-data'),
    ENABLE_DOCS: envBoolean(false),
    REQUEST_ID_HEADER_NAME: z.string().min(1).default('x-request-id'),
    CSRF_ENABLED: envBoolean(true),
    CSRF_HEADER_NAME: z.string().min(1).default('X-CSRF-Token'),
    COOKIE_CSRF_NAME: z.string().min(1).default('__Host-csrf'),
    CSRF_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    CSRF_COOKIE_SECURE: envBoolean(true),
    RATE_LIMIT_ENABLED: envBoolean(true),
    RATE_LIMIT_POINTS: z.coerce.number().int().min(1).default(60),
    RATE_LIMIT_DURATION_SEC: z.coerce.number().int().min(1).default(60),
    RATE_LIMIT_KEY_STRATEGY: z.enum(['ip', 'userId', 'sid']).default('ip'),
    RATE_LIMIT_HEADER_PREFIX: z.string().min(1).default('RateLimit'),
  })
  .superRefine((environment, context) => {
    if (
      environment.CSRF_SAMESITE === 'none' &&
      environment.CSRF_COOKIE_SECURE !== true
    ) {
      context.addIssue({
        code: 'custom',
        path: ['CSRF_COOKIE_SECURE'],
        message: 'must be true when CSRF_SAMESITE is none',
      });
    }

    if (environment.APP_ENV !== 'production') return;

    if (
      environment.WEB_ALLOWED_ORIGINS.some((origin) =>
        origin.startsWith('http://'),
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['WEB_ALLOWED_ORIGINS'],
        message: 'must use https:// only in production',
      });
    }

    if (
      environment.REDIRECT_ALLOWED_ORIGINS.some((origin) =>
        origin.startsWith('http://'),
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['REDIRECT_ALLOWED_ORIGINS'],
        message: 'must use https:// only in production',
      });
    }

    if (environment.FASTIFY_TRUST_PROXY === true) {
      context.addIssue({
        code: 'custom',
        path: ['FASTIFY_TRUST_PROXY'],
        message: 'must use a hop count instead of true in production',
      });
    }

    if (
      environment.CSRF_ENABLED &&
      environment.WEB_ALLOWED_ORIGINS.length === 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['WEB_ALLOWED_ORIGINS'],
        message: 'must be configured when CSRF is enabled in production',
      });
    }

    const hasHostOnlyCookie = [
      environment.SESSION_TOKEN_COOKIE,
      environment.SESSION_DATA_COOKIE,
      environment.COOKIE_CSRF_NAME,
    ].some((cookieName) => cookieName.startsWith('__Host-'));

    if (hasHostOnlyCookie && environment.COOKIE_ALLOWED_DOMAINS.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_ALLOWED_DOMAINS'],
        message: '__Host-* cookies must not set Domain',
      });
    }
  });

export const parseHttpConfig = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const env = schema.parse(environment);
  const originAllowlist = unique(env.WEB_ALLOWED_ORIGINS);

  return {
    trustProxy: env.FASTIFY_TRUST_PROXY,
    docs: { enabled: env.ENABLE_DOCS },
    requestId: { headerName: env.REQUEST_ID_HEADER_NAME.toLowerCase() },
    cors: { originAllowlist },
    redirects: { originAllowlist: unique(env.REDIRECT_ALLOWED_ORIGINS) },
    cookies: { domainAllowlist: unique(env.COOKIE_ALLOWED_DOMAINS) },
    csrf: {
      enabled: env.CSRF_ENABLED,
      headerName: env.CSRF_HEADER_NAME.toLowerCase(),
      cookieName: env.COOKIE_CSRF_NAME,
      sameSite: env.CSRF_SAMESITE,
      cookieSecure: env.CSRF_COOKIE_SECURE,
      originAllowlist,
      refererAllowlist: originAllowlist.map(withTrailingSlash),
    },
    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED,
      points: env.RATE_LIMIT_POINTS,
      durationSec: env.RATE_LIMIT_DURATION_SEC,
      keyStrategy: env.RATE_LIMIT_KEY_STRATEGY,
      headerPrefix: env.RATE_LIMIT_HEADER_PREFIX,
    },
  };
};

export default registerAs('http', parseHttpConfig);
