import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import { Injectable } from '@nestjs/common';
import {
  mapPrismaPermissionToEntity,
  permissionSelect,
} from './permissions.mapper.js';

@Injectable()
export class PrismaGrantsRepository implements GrantsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissionsForRoleIds(roleIds: string[]) {
    if (!roleIds.length) return [];

    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: {
        permission: { select: permissionSelect },
      },
    });

    return rows.map((x) => mapPrismaPermissionToEntity(x.permission));
  }

  async listUserOverrides(userId: string) {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId },
      select: {
        effect: true,
        permission: { select: permissionSelect },
      },
    });

    const allow = [];
    const deny = [];

    for (const r of rows) {
      const p = mapPrismaPermissionToEntity(r.permission);
      if (r.effect === 'DENY') deny.push(p);
      else allow.push(p);
    }

    return { allow, deny };
  }
}
