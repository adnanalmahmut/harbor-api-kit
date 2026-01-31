import { setupCors } from '#src/app.cors.js';
import { setupApiDocs } from '#src/app.docs.js';
import { AppModule } from '#src/app.module.js';
import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { validateEnv } from '#src/infrastructure/config/env.schema.js';
import { createRequestContextHook } from '#src/infrastructure/context/request-context.manager.js';
import { GlobalExceptionFilter } from '#src/infrastructure/http/filters/global-exception.filter.js';
import { RequestIdentityInterceptor } from '#src/infrastructure/http/interceptors/request-identity.interceptor.js';
import { ResponseInterceptor } from '#src/infrastructure/http/interceptors/response.interceptor.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { CsrfGuard } from '#src/infrastructure/security/csrf/csrf.guard.js';
import { GlobalValidationPipe } from '#src/infrastructure/validation/global-validation-pipe.js';
import fastifyCookie from '@fastify/cookie';
import {
  VersioningType,
  type LogLevel,
  type LoggerService,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { I18nService } from 'nestjs-i18n';
import { Logger } from 'nestjs-pino';

export async function createApp(opts?: {
  logger?: false | LogLevel[] | LoggerService;
}): Promise<NestFastifyApplication> {
  const env = validateEnv(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: env.FASTIFY_TRUST_PROXY,
    }),
    //  { logger: opts?.logger === false ? false : ['error', 'warn'] },
    // { logger: opts?.logger ?? false },
    {
      logger: opts?.logger ?? ['error', 'warn'],
      bufferLogs: true,
    },
  );
  return app;
}

export function configureApp(app: NestFastifyApplication) {
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(AppConfigService);
  const reflector = app.get(Reflector);
  const i18n = app.get<I18nService<Record<string, any>>>(I18nService);

  const adapter = app.getHttpAdapter().getInstance();

  adapter.register(fastifyCookie, {
    // optional: secret: '...' لو تريد signed cookies لاحقاً
  });

  app.useGlobalGuards(new CsrfGuard(config));

  setupCors(app, config);

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const redisService = app.get(RedisService);
  const requestContextHook = createRequestContextHook(config, redisService);
  adapter.addHook('onRequest', requestContextHook);

  app.useGlobalPipes(new GlobalValidationPipe());

  app.useGlobalInterceptors(
    new RequestIdentityInterceptor(),
    new ResponseInterceptor(reflector, i18n),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger, i18n, config));

  setupApiDocs(app, config);
  return config;
}

export async function setup() {
  const app = await createApp();
  const config = configureApp(app);
  await app.listen({ port: config.app().port, host: '0.0.0.0' });
}
