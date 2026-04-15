import {
  AppConfigModule,
  CORE_TOKENS,
  PrismaModule,
  RedisModule,
  RedisService,
  type RequestContextStorePort,
} from '#src/core/index.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { EffectivePermissionsService } from './application/services/effective-permissions.service.js';
import { AssignPermissionToRoleUseCase } from './application/use-cases/assign-permission-to-role.use-case.js';
import { CreatePermissionUseCase } from './application/use-cases/create-permission.use-case.js';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case.js';
import { DeletePermissionUseCase } from './application/use-cases/delete-permission.use-case.js';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case.js';
import { GetPermissionByIdUseCase } from './application/use-cases/get-permission-by-id.use-case.js';
import { GetRoleByIdUseCase } from './application/use-cases/get-role-by-id.use-case.js';
import { GetRolePermissionsUseCase } from './application/use-cases/get-role-permissions.use-case.js';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case.js';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case.js';
import { RemovePermissionFromRoleUseCase } from './application/use-cases/remove-permission-from-role.use-case.js';
import { ReplaceRolePermissionsUseCase } from './application/use-cases/replace-role-permissions.use-case.js';
import { UpdatePermissionUseCase } from './application/use-cases/update-permission.use-case.js';
import { UpdateRoleUseCase } from './application/use-cases/update-role.use-case.js';
import type { GrantsRepositoryPort } from './domain/ports/grants.repository.port.js';
import type { PermissionRepositoryPort } from './domain/ports/permission.repository.port.js';
import type { RoleRepositoryPort } from './domain/ports/role.repository.port.js';
import { CachedRoleRepository } from './infrastructure/persistence/cached-role.repository.js';
import { PrismaGrantsRepository } from './infrastructure/persistence/prisma-grants.repository.js';
import { PrismaPermissionRepository } from './infrastructure/persistence/prisma-permission.repository.js';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository.js';
import { RbacController } from './presentation/http/rbac.controller.js';
import { RBAC_TOKENS } from './rbac.tokens.js';
import { forwardRef, Module } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => AuthModule),
    AppConfigModule,
  ],
  controllers: [RbacController],
  providers: [
    // 1. Base Repositories (Prisma)
    {
      provide: PrismaRoleRepository,
      useClass: PrismaRoleRepository,
    },
    {
      provide: RBAC_TOKENS.GRANTS_REPOSITORY,
      useClass: PrismaGrantsRepository,
    },
    {
      provide: RBAC_TOKENS.PERMISSION_REPOSITORY,
      useClass: PrismaPermissionRepository,
    },

    // 2. Decorated Repository (Cached) - Implementation of RoleRepositoryPort
    {
      provide: RBAC_TOKENS.ROLE_REPOSITORY,
      useClass: CachedRoleRepository,
    },
    // Dependency for CachedRoleRepository (The Delegate)
    {
      provide: RBAC_TOKENS.ROLE_REPOSITORY_DELEGATE,
      useExisting: PrismaRoleRepository,
    },

    // 3. Application Services
    {
      provide: EffectivePermissionsService,
      useFactory: (
        roleRepo: RoleRepositoryPort,
        grantsRepo: GrantsRepositoryPort,
        redis: RedisService,
        contextStore: RequestContextStorePort,
        logger: Logger,
      ) => {
        return new EffectivePermissionsService(
          roleRepo,
          grantsRepo,
          redis,
          logger,
          contextStore,
        );
      },
      inject: [
        RBAC_TOKENS.ROLE_REPOSITORY,
        RBAC_TOKENS.GRANTS_REPOSITORY,
        RedisService,
        CORE_TOKENS.REQUEST_CONTEXT_STORE,
        Logger,
      ],
    },

    // 4. Use Cases
    {
      provide: CreateRoleUseCase,
      useFactory: (repo: RoleRepositoryPort) => new CreateRoleUseCase(repo),
      inject: [RBAC_TOKENS.ROLE_REPOSITORY],
    },
    {
      provide: ListRolesUseCase,
      useFactory: (repo: RoleRepositoryPort) => new ListRolesUseCase(repo),
      inject: [RBAC_TOKENS.ROLE_REPOSITORY],
    },
    {
      provide: CreatePermissionUseCase,
      useFactory: (repo: PermissionRepositoryPort) =>
        new CreatePermissionUseCase(repo),
      inject: [RBAC_TOKENS.PERMISSION_REPOSITORY],
    },
    {
      provide: ListPermissionsUseCase,
      useFactory: (repo: PermissionRepositoryPort) =>
        new ListPermissionsUseCase(repo),
      inject: [RBAC_TOKENS.PERMISSION_REPOSITORY],
    },
    {
      provide: AssignPermissionToRoleUseCase,
      useFactory: (repo: GrantsRepositoryPort) =>
        new AssignPermissionToRoleUseCase(repo),
      inject: [RBAC_TOKENS.GRANTS_REPOSITORY],
    },
    {
      provide: RemovePermissionFromRoleUseCase,
      useFactory: (repo: GrantsRepositoryPort) =>
        new RemovePermissionFromRoleUseCase(repo),
      inject: [RBAC_TOKENS.GRANTS_REPOSITORY],
    },
    {
      provide: GetRolePermissionsUseCase,
      useFactory: (repo: GrantsRepositoryPort) =>
        new GetRolePermissionsUseCase(repo),
      inject: [RBAC_TOKENS.GRANTS_REPOSITORY],
    },
    {
      provide: GetRoleByIdUseCase,
      useFactory: (repo: RoleRepositoryPort) => new GetRoleByIdUseCase(repo),
      inject: [RBAC_TOKENS.ROLE_REPOSITORY],
    },
    {
      provide: UpdateRoleUseCase,
      useFactory: (repo: RoleRepositoryPort) => new UpdateRoleUseCase(repo),
      inject: [RBAC_TOKENS.ROLE_REPOSITORY],
    },
    {
      provide: DeleteRoleUseCase,
      useFactory: (repo: RoleRepositoryPort) => new DeleteRoleUseCase(repo),
      inject: [RBAC_TOKENS.ROLE_REPOSITORY],
    },
    {
      provide: GetPermissionByIdUseCase,
      useFactory: (repo: PermissionRepositoryPort) =>
        new GetPermissionByIdUseCase(repo),
      inject: [RBAC_TOKENS.PERMISSION_REPOSITORY],
    },
    {
      provide: UpdatePermissionUseCase,
      useFactory: (repo: PermissionRepositoryPort) =>
        new UpdatePermissionUseCase(repo),
      inject: [RBAC_TOKENS.PERMISSION_REPOSITORY],
    },
    {
      provide: DeletePermissionUseCase,
      useFactory: (repo: PermissionRepositoryPort) =>
        new DeletePermissionUseCase(repo),
      inject: [RBAC_TOKENS.PERMISSION_REPOSITORY],
    },
    {
      provide: ReplaceRolePermissionsUseCase,
      useFactory: (
        roleRepo: RoleRepositoryPort,
        grantsRepo: GrantsRepositoryPort,
      ) => new ReplaceRolePermissionsUseCase(roleRepo, grantsRepo),
      inject: [RBAC_TOKENS.ROLE_REPOSITORY, RBAC_TOKENS.GRANTS_REPOSITORY],
    },
  ],
  exports: [
    EffectivePermissionsService,
    RBAC_TOKENS.ROLE_REPOSITORY,
    RBAC_TOKENS.GRANTS_REPOSITORY,
    RBAC_TOKENS.PERMISSION_REPOSITORY,
  ],
})
export class RbacModule {}
