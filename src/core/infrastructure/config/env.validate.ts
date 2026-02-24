import { AppException } from '#src/core/domain/index.js';
import { envSchema } from './env.schema.js';

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

  const uniq = <T>(arr: T[]) => Array.from(new Set(arr));

  const webOrigins = uniq(d.WEB_ALLOWED_ORIGINS);
  const redirectOrigins = uniq(d.REDIRECT_ALLOWED_ORIGINS);

  if (d.APP_ENV === 'production') {
    if (webOrigins.some((o) => o.startsWith('http://')))
      throw AppException.validationError({
        field: 'WEB_ALLOWED_ORIGINS',
        message: 'In production, WEB_ALLOWED_ORIGINS must use https:// only',
      });

    if (redirectOrigins.some((o) => o.startsWith('http://')))
      throw AppException.validationError({
        field: 'REDIRECT_ALLOWED_ORIGINS',
        message:
          'In production, REDIRECT_ALLOWED_ORIGINS must use https:// only',
      });
  }

  if (d.APP_ENV === 'production') {
    const mustHttps = [d.APP_PUBLIC_URL, d.FRONTEND_PUBLIC_URL];
    if (mustHttps.some((u) => !u.startsWith('https://'))) {
      throw AppException.validationError({
        field: 'APP_PUBLIC_URL',
        message:
          'In production, APP_PUBLIC_URL and FRONTEND_PUBLIC_URL must use https://',
      });
    }
  }

  const hostOnlyCookies = [
    d.SESSION_TOKEN_COOKIE,
    d.SESSION_DATA_COOKIE,
    d.COOKIE_CSRF_NAME,
  ].filter((n) => n.startsWith('__Host-'));

  if (
    d.APP_ENV === 'production' &&
    hostOnlyCookies.length > 0 &&
    d.COOKIE_ALLOWED_DOMAINS.length > 0
  ) {
    throw AppException.validationError({
      field: 'COOKIE_ALLOWED_DOMAINS',
      message:
        '__Host-* cookies must not set Domain; COOKIE_ALLOWED_DOMAINS should be empty or used only for non-__Host cookies',
    });
  }

  if (
    d.APP_ENV === 'production' &&
    d.CSRF_ENABLED === true &&
    d.WEB_ALLOWED_ORIGINS.length === 0
  ) {
    throw AppException.validationError({
      field: 'WEB_ALLOWED_ORIGINS',
      message: 'WEB_ALLOWED_ORIGINS must be configured in production',
    });
  }

  if (d.CSRF_SAMESITE === 'none' && d.CSRF_COOKIE_SECURE !== true) {
    throw AppException.validationError({
      field: 'CSRF_COOKIE_SECURE',
      message: 'CSRF_COOKIE_SECURE must be true when CSRF_SAMESITE is none',
    });
  }

  if (d.APP_ENV === 'production' && d.FASTIFY_TRUST_PROXY === true) {
    throw AppException.validationError({
      field: 'FASTIFY_TRUST_PROXY',
      message:
        'FASTIFY_TRUST_PROXY=true trusts ALL proxies and allows IP spoofing. Use a hop count (e.g. 1) in production.',
    });
  }

  return d;
}
