import type { httpConfig, i18nConfig } from '#src/config/index.js';
import { AppException } from './app-exception.js';
import type { ConfigType } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export function setupCors(
  app: NestFastifyApplication,
  http: ConfigType<typeof httpConfig>,
  i18n: ConfigType<typeof i18nConfig>,
) {
  const allowedOrigins = new Set(http.cors.originAllowlist);

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
      i18n.headerName,
      http.csrf.headerName,
      http.requestId.headerName,
    ],
    exposedHeaders: [http.requestId.headerName],
    maxAge: 86400,
  });
}
