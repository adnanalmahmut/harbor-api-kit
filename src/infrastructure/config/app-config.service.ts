import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvVars } from './env.schema.js';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  app() {
    return {
      name: this.config.get('APP_NAME'),
      env: this.config.get('APP_ENV'),
      port: this.config.get('APP_PORT'),
      enableDocs: this.config.get('ENABLE_DOCS'),
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

  cookies() {
    return {
      accessName: this.config.get('COOKIE_ACCESS_NAME'),
      refreshName: this.config.get('COOKIE_REFRESH_NAME'),
    };
  }

  cors() {
    return {
      trustedOrigins: this.config.get<string[]>('CORS_TRUSTED_ORIGINS'),
    };
  }

  db() {
    return {
      url: this.config.get('DATABASE_URL'),
    };
  }

  resend() {
    return {
      apiKey: this.config.get('RESEND_API_KEY'),
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
    return this.app().env === 'production';
  }

  fastify() {
    return {
      trustProxy: this.config.get('FASTIFY_TRUST_PROXY'),
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
    const origins = this.config.get<string[]>('CORS_TRUSTED_ORIGINS');
    const refererPrefixes = origins.map((o) => (o.endsWith('/') ? o : `${o}/`));

    return {
      enabled: this.config.get('CSRF_ENABLED'),
      headerName: this.config.get('CSRF_HEADER_NAME').toLowerCase(),
      cookieName: this.config.get('COOKIE_CSRF_NAME'),
      sameSite: this.config.get('CSRF_SAMESITE'),
      cookieSecure: this.config.get('CSRF_COOKIE_SECURE'),
      originAllowlist: origins,
      refererAllowlist: refererPrefixes,
    };
  }

  rateLimit() {
    return {
      enabled: this.config.get('RATE_LIMIT_ENABLED'),
      points: this.config.get('RATE_LIMIT_POINTS'),
      durationSec: this.config.get('RATE_LIMIT_DURATION_SEC'),
      keyStrategy: this.config.get('RATE_LIMIT_KEY_STRATEGY'),
      headerPrefix: this.config.get('RATE_LIMIT_HEADER_PREFIX').toLowerCase(),
    };
  }

  tenant() {
    return {
      strategy: this.config.get('TENANT_STRATEGY'),
      required: this.config.get('TENANT_REQUIRED'),
      headerName: this.config.get('TENANT_HEADER_NAME').toLowerCase(),
    };
  }
}
