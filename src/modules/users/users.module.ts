import { AppConfigModule, PrismaModule } from '#src/core/index.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AUTH_TOKENS, type AuthProviderPort } from '#src/modules/auth/index.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import {
  EffectivePermissionsService,
  type GrantsRepositoryPort,
  RBAC_TOKENS,
  type RoleRepositoryPort,
} from '#src/modules/rbac/index.js';
import { Module, forwardRef } from '@nestjs/common';
import { AddRoleToUserUseCase } from './application/use-cases/add-role-to-user.use-case.js';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { GetAllUserUseCase } from './application/use-cases/get-all-users.use-case.js';
import { GetUserEffectivePermissionsUseCase } from './application/use-cases/get-user-effective-permissions.use-case.js';
import { GetUserPermissionsUseCase } from './application/use-cases/get-user-permissions.use-case.js';
import { GetUserRolesUseCase } from './application/use-cases/get-user-roles.use-case.js';
import { GetUserByIdUseCase } from './application/use-cases/get-users.use-case.js';
import { RemoveRoleFromUserUseCase } from './application/use-cases/remove-role-from-user.use-case.js';
import { RemoveUserPermissionOverrideUseCase } from './application/use-cases/remove-user-permission-override.use-case.js';
import { ReplaceUserPermissionsUseCase } from './application/use-cases/replace-user-permissions.use-case.js';
import { ReplaceUserRolesUseCase } from './application/use-cases/replace-user-roles.use-case.js';
import { SetUserPermissionOverrideUseCase } from './application/use-cases/set-user-permission-override.use-case.js';
import { UpdateUserByIdUseCase } from './application/use-cases/update-user-by-id.use-case.js';
import type { UserRepositoryPort } from './domain/ports/user.repository.port.js';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository.js';
import { UsersController } from './presentation/http/users.controller.js';
import { USERS_TOKENS } from './users.tokens.js';

@Module({
  imports: [
    PrismaModule,
    RbacModule,
    forwardRef(() => AuthModule),
    AppConfigModule,
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: USERS_TOKENS.USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: GetAllUserUseCase,
      useFactory: (userRepo: UserRepositoryPort) => {
        return new GetAllUserUseCase(userRepo);
      },
      inject: [USERS_TOKENS.USER_REPOSITORY],
    },
    {
      provide: CreateUserUseCase,
      useFactory: (userRepo: UserRepositoryPort) => {
        return new CreateUserUseCase(userRepo);
      },
      inject: [USERS_TOKENS.USER_REPOSITORY],
    },
    {
      provide: GetUserByIdUseCase,
      useFactory: (userRepo: UserRepositoryPort) => {
        return new GetUserByIdUseCase(userRepo);
      },
      inject: [USERS_TOKENS.USER_REPOSITORY],
    },
    {
      provide: UpdateUserByIdUseCase,
      useFactory: (userRepo: UserRepositoryPort) => {
        return new UpdateUserByIdUseCase(userRepo);
      },
      inject: [USERS_TOKENS.USER_REPOSITORY],
    },

    // RBAC Management For Users
    {
      provide: AddRoleToUserUseCase,
      useFactory: (
        repo: RoleRepositoryPort,
        authProvider: AuthProviderPort,
        effectivePermissions: EffectivePermissionsService,
      ) => new AddRoleToUserUseCase(repo, authProvider, effectivePermissions),
      inject: [
        RBAC_TOKENS.ROLE_REPOSITORY,
        AUTH_TOKENS.AUTH_PROVIDER,
        EffectivePermissionsService,
      ],
    },
    {
      provide: RemoveRoleFromUserUseCase,
      useFactory: (
        repo: RoleRepositoryPort,
        authProvider: AuthProviderPort,
        effectivePermissions: EffectivePermissionsService,
      ) =>
        new RemoveRoleFromUserUseCase(repo, authProvider, effectivePermissions),
      inject: [
        RBAC_TOKENS.ROLE_REPOSITORY,
        AUTH_TOKENS.AUTH_PROVIDER,
        EffectivePermissionsService,
      ],
    },
    {
      provide: SetUserPermissionOverrideUseCase,
      useFactory: (
        repo: GrantsRepositoryPort,
        authProvider: AuthProviderPort,
        effectivePermissions: EffectivePermissionsService,
      ) =>
        new SetUserPermissionOverrideUseCase(
          repo,
          authProvider,
          effectivePermissions,
        ),
      inject: [
        RBAC_TOKENS.GRANTS_REPOSITORY,
        AUTH_TOKENS.AUTH_PROVIDER,
        EffectivePermissionsService,
      ],
    },
    {
      provide: RemoveUserPermissionOverrideUseCase,
      useFactory: (
        repo: GrantsRepositoryPort,
        authProvider: AuthProviderPort,
        effectivePermissions: EffectivePermissionsService,
      ) =>
        new RemoveUserPermissionOverrideUseCase(
          repo,
          authProvider,
          effectivePermissions,
        ),
      inject: [
        RBAC_TOKENS.GRANTS_REPOSITORY,
        AUTH_TOKENS.AUTH_PROVIDER,
        EffectivePermissionsService,
      ],
    },
    {
      provide: GetUserRolesUseCase,
      useFactory: (repo: RoleRepositoryPort) => new GetUserRolesUseCase(repo),
      inject: [RBAC_TOKENS.ROLE_REPOSITORY],
    },
    {
      provide: ReplaceUserRolesUseCase,
      useFactory: (
        repo: RoleRepositoryPort,
        authProvider: AuthProviderPort,
        effectivePermissions: EffectivePermissionsService,
      ) =>
        new ReplaceUserRolesUseCase(repo, authProvider, effectivePermissions),
      inject: [
        RBAC_TOKENS.ROLE_REPOSITORY,
        AUTH_TOKENS.AUTH_PROVIDER,
        EffectivePermissionsService,
      ],
    },
    {
      provide: GetUserPermissionsUseCase,
      useFactory: (repo: GrantsRepositoryPort) =>
        new GetUserPermissionsUseCase(repo),
      inject: [RBAC_TOKENS.GRANTS_REPOSITORY],
    },
    {
      provide: ReplaceUserPermissionsUseCase,
      useFactory: (
        repo: GrantsRepositoryPort,
        effectivePermissions: EffectivePermissionsService,
      ) => new ReplaceUserPermissionsUseCase(repo, effectivePermissions),
      inject: [RBAC_TOKENS.GRANTS_REPOSITORY, EffectivePermissionsService],
    },
    {
      provide: GetUserEffectivePermissionsUseCase,
      useFactory: (effectivePermissions: EffectivePermissionsService) =>
        new GetUserEffectivePermissionsUseCase(effectivePermissions),
      inject: [EffectivePermissionsService],
    },
  ],
  exports: [
    USERS_TOKENS.USER_REPOSITORY,
    CreateUserUseCase,
    GetUserByIdUseCase,
    UpdateUserByIdUseCase,
    AddRoleToUserUseCase,
    RemoveRoleFromUserUseCase,
    SetUserPermissionOverrideUseCase,
    RemoveUserPermissionOverrideUseCase,
    GetUserRolesUseCase,
    ReplaceUserRolesUseCase,
    GetUserPermissionsUseCase,
    ReplaceUserPermissionsUseCase,
    GetUserEffectivePermissionsUseCase,
  ],
})
export class UsersModule {}
