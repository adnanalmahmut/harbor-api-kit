import { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';
import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { Inject } from '@nestjs/common';

export class ListPermissionsUseCase {
  constructor(
    @Inject(RBAC_TOKENS.PERMISSION_REPOSITORY)
    private readonly permissionRepo: PermissionRepositoryPort,
  ) {}

  async execute(): Promise<Permission[]> {
    return this.permissionRepo.listAll();
  }
}
