import { appConfig, authConfig, httpConfig } from '#src/config/index.js';
import { PrismaService } from '#src/core/index.js';
import { AUTH_TOKENS } from './auth.tokens.js';
import {
  AuthConfigAdapter,
  AuthEmailHooks,
  RedisSessionTrackerAdapter,
  createBetterAuth,
} from './infrastructure/index.js';
import { AuthGuard } from './presentation/index.js';
import type { Provider } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export const authBindings: Provider[] = [
  AuthGuard,
  AuthEmailHooks,
  {
    provide: AUTH_TOKENS.BETTER_AUTH,
    useFactory: (
      prisma: PrismaService,
      authConfiguration: Parameters<typeof createBetterAuth>[1],
      appConfiguration: Parameters<typeof createBetterAuth>[2],
      httpConfiguration: Parameters<typeof createBetterAuth>[3],
      emailHooks: AuthEmailHooks,
      logger: PinoLogger,
    ) =>
      createBetterAuth(
        prisma,
        authConfiguration,
        appConfiguration,
        httpConfiguration,
        emailHooks,
        logger,
      ),
    inject: [
      PrismaService,
      authConfig.KEY,
      appConfig.KEY,
      httpConfig.KEY,
      AuthEmailHooks,
      PinoLogger,
    ],
  },
  {
    provide: AUTH_TOKENS.AUTH_CONFIG,
    useClass: AuthConfigAdapter,
  },
  {
    provide: AUTH_TOKENS.SESSION_TRACKER,
    useClass: RedisSessionTrackerAdapter,
  },
];
