import { AppException } from '#src/core/domain/index.js';
import { AppConfigService } from '#src/core/infrastructure/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export function setupCors(
  app: NestFastifyApplication,
  config: AppConfigService,
) {
  const i18nConfig = config.i18n();
  const corsConfig = config.cors();
  const csrfConfig = config.csrf();
  const requestIdConfig = config.requestId();

  const allowedOrigins = new Set(corsConfig.originAllowlist);

  app.enableCors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin === 'null') return cb(AppException.notAllowedByCORS(), false);
      if (allowedOrigins.has(origin)) {
        return cb(null, true);
      }

      return cb(AppException.notAllowedByCORS(), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      i18nConfig.headerName,
      csrfConfig.headerName,
      requestIdConfig.headerName,
    ],
    exposedHeaders: [requestIdConfig.headerName],
    maxAge: 86400,
  });
}
