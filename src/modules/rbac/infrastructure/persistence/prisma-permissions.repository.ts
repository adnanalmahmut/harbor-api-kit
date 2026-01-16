import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';
import { Injectable } from '@nestjs/common';
import {
  mapPrismaPermissionToEntity,
  permissionSelect,
} from './permissions.mapper.js';

@Injectable()
export class PrismaPermissionsRepository implements PermissionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    const rows = await this.prisma.permission.findMany({
      select: permissionSelect,
      orderBy: { index: 'asc' },
    });
    return rows.map(mapPrismaPermissionToEntity);
  }

  async findById(id: string) {
    const r = await this.prisma.permission.findUnique({
      where: { id },
      select: permissionSelect,
    });
    return r ? mapPrismaPermissionToEntity(r) : null;
  }

  async findByKey(action: string, subject: string) {
    const r = await this.prisma.permission.findUnique({
      where: { action_subject: { action, subject } },
      select: permissionSelect,
    });
    return r ? mapPrismaPermissionToEntity(r) : null;
  }

  async findManyByIds(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.prisma.permission.findMany({
      where: { id: { in: ids } },
      select: permissionSelect,
    });
    return rows.map(mapPrismaPermissionToEntity);
  }
}
