import { setupCors } from '#src/app.cors.js';
import { setupApiDocs } from '#src/app.docs.js';
import { AppModule } from '#src/app.module.js';
import type { RequestContextStorePort } from '#src/core/domain/ports/request-context.store.port.js';
import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { validateEnv } from '#src/core/infrastructure/config/env.schema.js';
import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
import { GlobalExceptionFilter } from '#src/core/presentation/http/filters/global-exception.filter.js';
import { createRequestContextHook } from '#src/core/presentation/http/hooks/request-context.hook.js';
import { RequestIdentityInterceptor } from '#src/core/presentation/http/interceptors/request-identity.interceptor.js';
import { ResponseInterceptor } from '#src/core/presentation/http/interceptors/response.interceptor.js';
import { CsrfGuard } from '#src/core/presentation/http/security/csrf/csrf.guard.js';
import { GlobalValidationPipe } from '#src/core/presentation/http/validation/global-validation-pipe.js';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
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
import { CORE_TOKENS } from './core/core.tokens.js';

export async function createApp(opts?: {
  logger?: false | LogLevel[] | LoggerService;
}): Promise<NestFastifyApplication> {
  // Use validateEnv for consistent configuration (single source of truth)
  const validatedEnv = validateEnv(process.env);
  const trustProxy = validatedEnv.FASTIFY_TRUST_PROXY;

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy,
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

  adapter.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  app.useGlobalGuards(new CsrfGuard(config, reflector));

  setupCors(app, config);

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const redisService = app.get(RedisService);
  const contextStore = app.get<RequestContextStorePort>(
    CORE_TOKENS.REQUEST_CONTEXT_STORE,
  );

  const requestContextHook = createRequestContextHook(
    config,
    contextStore,
    redisService,
  );
  adapter.addHook('onRequest', requestContextHook);

  app.useGlobalPipes(new GlobalValidationPipe());

  app.useGlobalInterceptors(
    new RequestIdentityInterceptor(contextStore),
    new ResponseInterceptor(reflector, i18n, contextStore),
  );

  app.useGlobalFilters(
    new GlobalExceptionFilter(logger, i18n, config, contextStore),
  );

  setupApiDocs(app, config);
  return config;
}

export async function setup() {
  const app = await createApp();
  const config = configureApp(app);
  await app.listen({ port: config.app().port, host: '0.0.0.0' });
}
