import {
  CORE_TOKENS,
  RedisService,
  type RequestContextStorePort,
} from '#src/core/index.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { EffectivePermissionsService } from './application/services/effective-permissions.service.js';
import { GetUserEffectivePermissionsUseCase } from './application/use-cases/get-user-effective-permissions.use-case.js';
import { GetUserPermissionsUseCase } from './application/use-cases/get-user-permissions.use-case.js';
import { RemoveUserPermissionOverrideUseCase } from './application/use-cases/remove-user-permission-override.use-case.js';
import { ReplaceUserPermissionsUseCase } from './application/use-cases/replace-user-permissions.use-case.js';
import { SetUserPermissionOverrideUseCase } from './application/use-cases/set-user-permission-override.use-case.js';
import type { AuthorizationRepositoryPort } from './domain/ports/authorization.repository.port.js';
import { PrismaAuthorizationRepository } from './infrastructure/persistence/prisma-authorization.repository.js';
import { UserPermissionsController } from './presentation/http/user-permissions.controller.js';
import { PermissionsGuard } from './presentation/http/guards/permissions.guard.js';
import { AUTHORIZATION_TOKENS } from './authorization.tokens.js';
import { forwardRef, Module } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Module({
  // Cycle: auth needs EffectivePermissionsService to guard the Better Auth
  // admin routes; authorization needs AuthGuard for its own controller.
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserPermissionsController],
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
    {
      provide: GetUserPermissionsUseCase,
      useFactory: (repository: AuthorizationRepositoryPort) =>
        new GetUserPermissionsUseCase(repository),
      inject: [AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY],
    },
    {
      provide: SetUserPermissionOverrideUseCase,
      useFactory: (
        repository: AuthorizationRepositoryPort,
        permissions: EffectivePermissionsService,
      ) => new SetUserPermissionOverrideUseCase(repository, permissions),
      inject: [
        AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY,
        EffectivePermissionsService,
      ],
    },
    {
      provide: RemoveUserPermissionOverrideUseCase,
      useFactory: (
        repository: AuthorizationRepositoryPort,
        permissions: EffectivePermissionsService,
      ) => new RemoveUserPermissionOverrideUseCase(repository, permissions),
      inject: [
        AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY,
        EffectivePermissionsService,
      ],
    },
    {
      provide: ReplaceUserPermissionsUseCase,
      useFactory: (
        repository: AuthorizationRepositoryPort,
        permissions: EffectivePermissionsService,
      ) => new ReplaceUserPermissionsUseCase(repository, permissions),
      inject: [
        AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY,
        EffectivePermissionsService,
      ],
    },
    {
      provide: GetUserEffectivePermissionsUseCase,
      useFactory: (permissions: EffectivePermissionsService) =>
        new GetUserEffectivePermissionsUseCase(permissions),
      inject: [EffectivePermissionsService],
    },
  ],
  exports: [
    PermissionsGuard,
    EffectivePermissionsService,
    AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY,
  ],
})
export class AuthorizationModule {}
