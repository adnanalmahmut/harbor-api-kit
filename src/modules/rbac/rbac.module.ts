import { PrismaModule } from '#src/infrastructure/db/prisma/prisma.module.js';
import { Module } from '@nestjs/common';
import { EffectivePermissionsService } from './application/services/effective-permissions.service.js';
import { PrismaPermissionsRepository } from './infrastructure/persistence/prisma-permissions.repository.js';
import { PrismaRolesRepository } from './infrastructure/persistence/prisma-roles.repository.js';
import { PrismaGrantsRepository } from './infrastructure/persistence/prisma-user-permissions.repository.js';
import { RBAC_TOKENS } from './rbac.tokens.js';

@Module({
  imports: [PrismaModule],
  providers: [
    EffectivePermissionsService,

    {
      provide: RBAC_TOKENS.PERMISSION_REPOSITORY,
      useClass: PrismaPermissionsRepository,
    },
    { provide: RBAC_TOKENS.ROLE_REPOSITORY, useClass: PrismaRolesRepository },
    {
      provide: RBAC_TOKENS.GRANTS_REPOSITORY,
      useClass: PrismaGrantsRepository,
    },

    // Bridge injection (لأن EffectivePermissionsService يستخدم interfaces)
    {
      provide: 'RBAC_ROLES_REPO',
      useExisting: RBAC_TOKENS.ROLE_REPOSITORY,
    },
    {
      provide: 'RBAC_GRANTS_REPO',
      useExisting: RBAC_TOKENS.GRANTS_REPOSITORY,
    },
  ],
  exports: [
    EffectivePermissionsService,
    RBAC_TOKENS.PERMISSION_REPOSITORY,
    RBAC_TOKENS.ROLE_REPOSITORY,
    RBAC_TOKENS.GRANTS_REPOSITORY,
  ],
})
export class RbacModule {}
