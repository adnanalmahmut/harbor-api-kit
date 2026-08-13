import { appConfig, authConfig, httpConfig } from '#src/config/index.js';
import { CachePort } from '#src/infrastructure/cache/cache.port.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { NotifyModule } from '#src/modules/notify/notify.module.js';
import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import { forwardRef, Module } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AuthEmailSenderAdapter } from './auth-email.adapter.js';
import { AuthGuard } from './auth.guard.js';
import { BETTER_AUTH, createBetterAuth } from './better-auth.js';
import { BetterAuthRouteRegistrar } from './better-auth.registrar.js';

@Module({
  // Cycle: authorization's own controller needs AuthGuard from this module.
  imports: [forwardRef(() => AuthorizationModule), NotifyModule],
  providers: [
    AuthGuard,
    AuthEmailSenderAdapter,
    BetterAuthRouteRegistrar,
    {
      // Better Auth is a factory-built object, so this stays a useFactory —
      // `PrismaService` is injected here because Better Auth's own Prisma
      // adapter needs the client (see docs/persistence.md), and `CachePort`
      // because Redis is its session and rate-limit store. The inject list is
      // the factory's parameter list, so no wrapper closure is needed.
      provide: BETTER_AUTH,
      useFactory: createBetterAuth,
      inject: [
        PrismaService,
        authConfig.KEY,
        appConfig.KEY,
        httpConfig.KEY,
        AuthEmailSenderAdapter,
        PinoLogger,
        CachePort,
      ],
    },
  ],
  exports: [AuthGuard, BETTER_AUTH],
})
export class AuthModule {}
