import { appConfig, authConfig, httpConfig } from '#src/config/index.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { NotifyModule } from '#src/modules/notify/notify.module.js';
import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import { forwardRef, Module } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  AuthConfigAdapter,
  AuthEmailSenderAdapter,
  RedisSessionTrackerAdapter,
} from './auth.adapters.js';
import { AuthGuard } from './auth.guard.js';
import { AuthConfigPort, SessionTrackerPort } from './auth.ports.js';
import { BETTER_AUTH, createBetterAuth } from './better-auth.js';
import { BetterAuthRouteRegistrar } from './better-auth.registrar.js';

@Module({
  // Cycle: authorization's own controller needs AuthGuard from this module.
  imports: [forwardRef(() => AuthorizationModule), NotifyModule],
  providers: [
    AuthGuard,
    AuthEmailSenderAdapter,
    BetterAuthRouteRegistrar,
    { provide: AuthConfigPort, useClass: AuthConfigAdapter },
    { provide: SessionTrackerPort, useClass: RedisSessionTrackerAdapter },
    {
      // Better Auth is a factory-built object, so this stays a useFactory —
      // `PrismaService` is injected here because Better Auth's own Prisma
      // adapter needs the client (see docs/persistence.md). The inject list is
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
      ],
    },
  ],
  exports: [AuthGuard, BETTER_AUTH, AuthConfigPort, SessionTrackerPort],
})
export class AuthModule {}
