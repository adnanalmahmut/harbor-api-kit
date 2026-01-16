import fastifyCookie from '@fastify/cookie';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { I18nService } from 'nestjs-i18n';
import { Logger } from 'nestjs-pino';
import { setupCors } from './app.cors.js';
import { setupApiDocs } from './app.docs.js';
import { AppModule } from './app.module.js';
import { AppConfigService } from './infrastructure/config/app-config.service.js';
import { validateEnv } from './infrastructure/config/env.schema.js';
import { createRequestContextHook } from './infrastructure/context/request-context.manager.js';
import { GlobalExceptionFilter } from './infrastructure/http/filters/global-exception.filter.js';
import { RequestIdentityInterceptor } from './infrastructure/http/interceptors/request-identity.interceptor.js';
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor.js';
import { CsrfGuard } from './infrastructure/security/csrf/csrf.guard.js';
import { GlobalValidationPipe } from './infrastructure/validation/global-validation-pipe.js';

export async function createApp(opts?: {
  logger?: boolean | any;
}): Promise<NestFastifyApplication> {
  const env = validateEnv(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: env.FASTIFY_TRUST_PROXY,
    }),
    //  { logger: opts?.logger === false ? false : ['error', 'warn'] },
    { logger: opts?.logger ?? false },
  );
  return app;
}

export function configureApp(app: NestFastifyApplication) {
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(AppConfigService);
  const reflector = app.get(Reflector);
  const i18n = app.get(I18nService) as I18nService<Record<string, any>>;

  const adapter = app.getHttpAdapter().getInstance();

  adapter.register(fastifyCookie, {
    // optional: secret: '...' لو تريد signed cookies لاحقاً
  });

  app.useGlobalGuards(new CsrfGuard(config));

  setupCors(app, config);

  const requestContextHook = createRequestContextHook(config);
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
