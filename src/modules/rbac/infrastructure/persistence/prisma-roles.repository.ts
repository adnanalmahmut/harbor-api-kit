import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RoleEntity } from '#src/modules/rbac/domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaRolesRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string) {
    const r = await this.prisma.role.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return r
      ? new RoleEntity(
          r.id,
          r.name,
          r.slug,
          r.description,
          r.isSystem,
          r.createdAt,
          r.updatedAt,
        )
      : null;
  }

  async listUserRoleIds(userId: string) {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    });
    return rows.map((r) => r.roleId);
  }

  async listRolesForUser(userId: string) {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isSystem: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return rows.map(
      (x) =>
        new RoleEntity(
          x.role.id,
          x.role.name,
          x.role.slug,
          x.role.description,
          x.role.isSystem,
          x.role.createdAt,
          x.role.updatedAt,
        ),
    );
  }
}
