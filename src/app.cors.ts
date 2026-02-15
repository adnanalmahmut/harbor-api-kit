import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import type { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export function setupCors(
  app: NestFastifyApplication,
  config: AppConfigService,
) {
  const i18nConfig = config.i18n();
  const corsConfig = config.cors();
  const csrfConfig = config.csrf();
  const requestIdConfig = config.requestId();

  const trustedOrigins = new Set(corsConfig.trustedOrigins);

  app.enableCors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin || origin === 'null') return cb(null, true);

      if (trustedOrigins.has(origin)) {
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
