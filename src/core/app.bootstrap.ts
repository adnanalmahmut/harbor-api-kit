import { AppModule } from '#src/app.module.js';
import {
  appConfig,
  authConfig,
  httpConfig,
  i18nConfig,
  parseHttpConfig,
  tenantConfig,
} from '#src/config/index.js';
import type { RequestContextStorePort } from '#src/core/domain/index.js';
import { RedisService } from '#src/core/infrastructure/index.js';
import {
  AUTH_TOKENS,
  type BetterAuthInstance,
  normalizeBetterAuthOpenApiDocument,
} from '#src/modules/auth/index.js';
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
import type { ConfigType } from '@nestjs/config';
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
  const http = parseHttpConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: http.trustProxy,
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

export async function configureApp(app: NestFastifyApplication) {
  const logger = app.get(Logger);
  app.useLogger(logger);

  const appConfiguration = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const auth = app.get<ConfigType<typeof authConfig>>(authConfig.KEY);
  const http = app.get<ConfigType<typeof httpConfig>>(httpConfig.KEY);
  const i18nConfigValue = app.get<ConfigType<typeof i18nConfig>>(
    i18nConfig.KEY,
  );
  const tenant = app.get<ConfigType<typeof tenantConfig>>(tenantConfig.KEY);
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

  app.useGlobalGuards(new CsrfGuard(appConfiguration, auth, http, reflector));

  setupCors(app, http, i18nConfigValue);

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
    http,
    tenant,
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
    new GlobalExceptionFilter(logger, i18n, http, contextStore),
  );

  if (!appConfiguration.isProduction && http.docs.enabled) {
    const betterAuth = app.get<BetterAuthInstance>(AUTH_TOKENS.BETTER_AUTH);
    await setupApiDocs(
      app,
      appConfiguration,
      http,
      betterAuth,
      normalizeBetterAuthOpenApiDocument,
    );
  }
  return appConfiguration;
}

export async function setup() {
  const app = await createApp();
  const config = await configureApp(app);
  await app.listen({ port: config.port, host: '0.0.0.0' });
}
