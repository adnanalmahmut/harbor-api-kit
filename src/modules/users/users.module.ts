import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import {
  AUTHORIZATION_TOKENS,
  EffectivePermissionsService,
  type AuthorizationRepositoryPort,
} from '#src/modules/authorization/index.js';
import { forwardRef, Module } from '@nestjs/common';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { GetAllUsersUseCase } from './application/use-cases/get-all-users.use-case.js';
import { GetUserEffectivePermissionsUseCase } from './application/use-cases/get-user-effective-permissions.use-case.js';
import { GetUserPermissionsUseCase } from './application/use-cases/get-user-permissions.use-case.js';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case.js';
import { RemoveUserPermissionOverrideUseCase } from './application/use-cases/remove-user-permission-override.use-case.js';
import { ReplaceUserPermissionsUseCase } from './application/use-cases/replace-user-permissions.use-case.js';
import { SetUserPermissionOverrideUseCase } from './application/use-cases/set-user-permission-override.use-case.js';
import { UpdateUserByIdUseCase } from './application/use-cases/update-user-by-id.use-case.js';
import type { UserRepositoryPort } from './domain/ports/user.repository.port.js';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository.js';
import { UsersController } from './presentation/http/users.controller.js';
import { USERS_TOKENS } from './users.tokens.js';

@Module({
  imports: [AuthorizationModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [
    {
      provide: USERS_TOKENS.USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: GetAllUsersUseCase,
      useFactory: (repository: UserRepositoryPort) =>
        new GetAllUsersUseCase(repository),
      inject: [USERS_TOKENS.USER_REPOSITORY],
    },
    {
      provide: CreateUserUseCase,
      useFactory: (repository: UserRepositoryPort) =>
        new CreateUserUseCase(repository),
      inject: [USERS_TOKENS.USER_REPOSITORY],
    },
    {
      provide: GetUserByIdUseCase,
      useFactory: (repository: UserRepositoryPort) =>
        new GetUserByIdUseCase(repository),
      inject: [USERS_TOKENS.USER_REPOSITORY],
    },
    {
      provide: UpdateUserByIdUseCase,
      useFactory: (repository: UserRepositoryPort) =>
        new UpdateUserByIdUseCase(repository),
      inject: [USERS_TOKENS.USER_REPOSITORY],
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
      provide: GetUserPermissionsUseCase,
      useFactory: (repository: AuthorizationRepositoryPort) =>
        new GetUserPermissionsUseCase(repository),
      inject: [AUTHORIZATION_TOKENS.AUTHORIZATION_REPOSITORY],
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
    USERS_TOKENS.USER_REPOSITORY,
    CreateUserUseCase,
    GetUserByIdUseCase,
    UpdateUserByIdUseCase,
    SetUserPermissionOverrideUseCase,
    RemoveUserPermissionOverrideUseCase,
    GetUserPermissionsUseCase,
    ReplaceUserPermissionsUseCase,
    GetUserEffectivePermissionsUseCase,
  ],
})
export class UsersModule {}
