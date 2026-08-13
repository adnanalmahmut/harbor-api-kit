import { appConfig, authConfig, httpConfig } from '#src/config/index.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { NotifyModule } from '#src/modules/notify/notify.module.js';
import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import { forwardRef, Module } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  AuthConfigAdapter,
  RedisSessionTrackerAdapter,
} from './auth.adapters.js';
import { AuthGuard } from './auth.guard.js';
import { AuthConfigPort, SessionTrackerPort } from './auth.ports.js';
import { AuthEmailHooks } from './better-auth/auth-email.hooks.js';
import { BetterAuthRouteRegistrar } from './better-auth/better-auth-route.registrar.js';
import { createBetterAuth } from './better-auth/better-auth.js';
import { BETTER_AUTH } from './better-auth/better-auth.token.js';

@Module({
  // Cycle: authorization's own controller needs AuthGuard from this module.
  imports: [forwardRef(() => AuthorizationModule), NotifyModule],
  providers: [
    AuthGuard,
    AuthEmailHooks,
    BetterAuthRouteRegistrar,
    { provide: AuthConfigPort, useClass: AuthConfigAdapter },
    { provide: SessionTrackerPort, useClass: RedisSessionTrackerAdapter },
    {
      // Better Auth is a factory-built object, so this stays a useFactory —
      // `PrismaService` is injected here because Better Auth's own Prisma
      // adapter needs the client (see docs/persistence.md).
      provide: BETTER_AUTH,
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
  ],
  exports: [AuthGuard, BETTER_AUTH, AuthConfigPort, SessionTrackerPort],
})
export class AuthModule {}
