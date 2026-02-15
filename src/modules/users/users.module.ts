import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { PrismaModule } from '#src/core/infrastructure/db/prisma/prisma.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { AddRoleToUserUseCase } from '#src/modules/users/application/use-cases/add-role-to-user.use-case.js';
import { CreateUserUseCase } from '#src/modules/users/application/use-cases/create-user.use-case.js';
import { GetAllUserUseCase } from '#src/modules/users/application/use-cases/get-all-users.use-case.js';
import { GetUserEffectivePermissionsUseCase } from '#src/modules/users/application/use-cases/get-user-effective-permissions.use-case.js';
import { GetUserPermissionsUseCase } from '#src/modules/users/application/use-cases/get-user-permissions.use-case.js';
import { GetUserRolesUseCase } from '#src/modules/users/application/use-cases/get-user-roles.use-case.js';
import { GetUserByIdUseCase } from '#src/modules/users/application/use-cases/get-users.use-case.js';
import { RemoveRoleFromUserUseCase } from '#src/modules/users/application/use-cases/remove-role-from-user.use-case.js';
import { RemoveUserPermissionOverrideUseCase } from '#src/modules/users/application/use-cases/remove-user-permission-override.use-case.js';
import { ReplaceUserPermissionsUseCase } from '#src/modules/users/application/use-cases/replace-user-permissions.use-case.js';
import { ReplaceUserRolesUseCase } from '#src/modules/users/application/use-cases/replace-user-roles.use-case.js';
import { SetUserPermissionOverrideUseCase } from '#src/modules/users/application/use-cases/set-user-permission-override.use-case.js';
import { UpdateUserByIdUseCase } from '#src/modules/users/application/use-cases/update-user-by-id.use-case.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';
import { PrismaUserRepository } from '#src/modules/users/infrastructure/persistence/prisma-user.repository.js';
import { UsersController } from '#src/modules/users/presentation/http/users.controller.js';
import { USERS_TOKENS } from '#src/modules/users/users.tokens.js';
import { Module, forwardRef } from '@nestjs/common';

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
