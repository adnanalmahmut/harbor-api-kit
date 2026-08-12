import {
  CORE_TOKENS,
  RedisService,
  type RequestContextStorePort,
} from '#src/core/index.js';
import { EffectivePermissionsService } from './application/services/effective-permissions.service.js';
import type { AuthorizationRepositoryPort } from './domain/ports/authorization.repository.port.js';
import { PrismaAuthorizationRepository } from './infrastructure/persistence/prisma-authorization.repository.js';
import { PermissionsGuard } from './presentation/http/guards/permissions.guard.js';
import { AUTHORIZATION_TOKENS } from './authorization.tokens.js';
import { Module } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Module({
  providers: [
    PermissionsGuard,
    {
      provide: AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY,
      useClass: PrismaAuthorizationRepository,
    },
    {
      provide: EffectivePermissionsService,
      useFactory: (
        repository: AuthorizationRepositoryPort,
        redis: RedisService,
        logger: Logger,
        contextStore: RequestContextStorePort,
      ) =>
        new EffectivePermissionsService(
          repository,
          redis,
          logger,
          contextStore,
        ),
      inject: [
        AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY,
        RedisService,
        Logger,
        CORE_TOKENS.REQUEST_CONTEXT_STORE,
      ],
    },
  ],
  exports: [
    PermissionsGuard,
    EffectivePermissionsService,
    AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY,
  ],
})
export class AuthorizationModule {}
