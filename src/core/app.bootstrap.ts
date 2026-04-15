import { AppModule } from '#src/app.module.js';
import type { RequestContextStorePort } from '#src/core/domain/index.js';
import {
  AppConfigService,
  RedisService,
  validateEnv,
} from '#src/core/infrastructure/index.js';
import {
  CsrfGuard,
  GlobalExceptionFilter,
  GlobalValidationPipe,
  RequestIdentityInterceptor,
  ResponseInterceptor,
  createRequestContextHook,
  setupApiDocs,
  setupCors,
} from '#src/core/presentation/index.js';
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
import { CORE_TOKENS } from './core.tokens.js';

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
    // optional: secret: '...', // for signed cookies
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

  // Defense-in-depth: security headers at application level
  // (nginx also sets these, but this protects dev/staging without nginx)
  adapter.addHook(
    'onSend',
    (
      _request: unknown,
      reply: { header: (k: string, v: string) => void },
      _payload: unknown,
      done: () => void,
    ) => {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      reply.header('X-XSS-Protection', '0');
      done();
    },
  );

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
