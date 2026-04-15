import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvVars } from './env.schema.js';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  private uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }

  private withTrailingSlash(origin: string): string {
    return origin.endsWith('/') ? origin : `${origin}/`;
  }

  app() {
    return {
      name: this.config.get('APP_NAME'),
      env: this.config.get('APP_ENV'),
      publicUrl: this.config.get('APP_PUBLIC_URL'),
      port: this.config.get('APP_PORT'),
      frontendPublicUrl: this.config.get('FRONTEND_PUBLIC_URL'),
    };
  }

  docs() {
    return {
      enabled: this.config.get('ENABLE_DOCS'),
    };
  }

  logger() {
    return {
      level: this.config.get('LOG_LEVEL'),
      pretty: this.config.get('LOG_PRETTY'),
    };
  }

  requestId() {
    return {
      headerName: this.config.get('REQUEST_ID_HEADER_NAME').toLowerCase(),
    };
  }

  i18n() {
    return {
      defaultLocale: this.config.get('I18N_DEFAULT_LOCALE'),
      headerName: this.config.get('I18N_HEADER_NAME').toLowerCase(),
      queryName: this.config.get('I18N_QUERY_NAME').toLowerCase(),
    };
  }

  isProd() {
    return this.config.get('APP_ENV') === 'production';
  }

  fastify() {
    return {
      trustProxy: this.config.get('FASTIFY_TRUST_PROXY'),
    };
  }

  cors(): { originAllowlist: string[] } {
    return {
      originAllowlist: this.uniq(
        this.config.get<string[]>('WEB_ALLOWED_ORIGINS'),
      ),
    };
  }

  cookies() {
    return {
      domainAllowlist: this.uniq(
        this.config.get<string[]>('COOKIE_ALLOWED_DOMAINS'),
      ),
    };
  }

  auth() {
    return {
      sessionTokenCookie: this.config.get('SESSION_TOKEN_COOKIE'),
      sessionDataCookie: this.config.get('SESSION_DATA_COOKIE'),
      session: {
        persistentExpiresInSec: this.config.get(
          'AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC',
        ),
        rollingUpdateAgeSec: this.config.get(
          'AUTH_SESSION_ROLLING_UPDATE_AGE_SEC',
        ),
      },

      redirectAllowlist: this.uniq(
        this.config.get<string[]>('REDIRECT_ALLOWED_ORIGINS'),
      ),

      betterAuthUrl: this.config.get('BETTER_AUTH_URL'),
      betterAuthSecret: this.config.get('BETTER_AUTH_SECRET'),

      providers: {
        google: {
          clientId: this.config.get('GOOGLE_CLIENT_ID'),
          clientSecret: this.config.get('GOOGLE_CLIENT_SECRET'),
        },
        github: {
          clientId: this.config.get('GITHUB_CLIENT_ID'),
          clientSecret: this.config.get('GITHUB_CLIENT_SECRET'),
        },
      },
    };
  }

  db() {
    return {
      url: this.config.get('DATABASE_URL'),
    };
  }

  redis() {
    return {
      url: this.config.get('REDIS_URL'),
      prefix: this.config.get('REDIS_PREFIX'),
      defaultTtlSec: this.config.get('REDIS_DEFAULT_TTL_SEC'),
    };
  }

  csrf() {
    const origins = this.config.get<string[]>('WEB_ALLOWED_ORIGINS');
    const refererAllowlist = origins.map((o) => this.withTrailingSlash(o));

    return {
      enabled: this.config.get('CSRF_ENABLED'),
      headerName: this.config.get('CSRF_HEADER_NAME').toLowerCase(),
      cookieName: this.config.get('COOKIE_CSRF_NAME'),
      sameSite: this.config.get('CSRF_SAMESITE'),
      cookieSecure: this.config.get('CSRF_COOKIE_SECURE'),

      originAllowlist: origins,
      refererAllowlist,
    };
  }

  rateLimit() {
    return {
      enabled: this.config.get('RATE_LIMIT_ENABLED'),
      points: this.config.get('RATE_LIMIT_POINTS'),
      durationSec: this.config.get('RATE_LIMIT_DURATION_SEC'),
      keyStrategy: this.config.get('RATE_LIMIT_KEY_STRATEGY'),
      headerPrefix: this.config.get('RATE_LIMIT_HEADER_PREFIX'),
    };
  }

  tenant() {
    return {
      strategy: this.config.get('TENANT_STRATEGY'),
      required: this.config.get('TENANT_REQUIRED'),
      headerName: this.config.get('TENANT_HEADER_NAME').toLowerCase(),
    };
  }

  email() {
    return {
      from: {
        email: this.config.get('RESEND_FROM_EMAIL'),
        name: this.config.get('RESEND_FROM_NAME'),
      },
      resend: {
        apiKey: this.config.get('RESEND_API_KEY'),
      },
    };
  }

  notify() {
    return {
      email: {
        retryAttempts: this.config.get('NOTIFY_EMAIL_RETRY_ATTEMPTS'),
        retryDelayMs: this.config.get('NOTIFY_EMAIL_RETRY_DELAY_MS'),
      },
    };
  }

  storage() {
    return {
      driver: this.config.get('STORAGE_DRIVER'),
      s3: {
        endpoint: this.config.get('S3_ENDPOINT'),
        region: this.config.get('S3_REGION'),
        accessKeyId: this.config.get('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY'),
        bucket: this.config.get('S3_BUCKET'),
      },
      gcs: {
        projectId: this.config.get('GCS_PROJECT_ID'),
        keyFile: this.config.get('GCS_KEY_FILE'),
        bucket: this.config.get('GCS_BUCKET'),
      },
      local: {
        path: this.config.get('LOCAL_STORAGE_PATH'),
      },
    };
  }
}
