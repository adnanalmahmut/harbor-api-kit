import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { Role } from '#src/modules/rbac/domain/entities/role.entity.js';
import { RbacException } from '#src/modules/rbac/domain/exceptions/rbac.exception.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
// We use our infra/redis/redis.keys
import { redisKeys } from '#src/infrastructure/redis/redis.keys.js';
import { Injectable } from '@nestjs/common';
// We need a token for CacheManager. Usually it's 'CACHE_MANAGER' or we define one.
// Or we inject RedisService directly?
// In SharedModule we might export a CacheManagerPort provider.
// Let's assume we can inject RedisService from infrastructure/redis/redis.service.ts if we export it.
// The user rule says: "Prisma repos ... No NestJS/Prisma/Redis/HTTP/i18n." -> Wait.
// "Prohibited imports in Domain/Application".
// "Infrastructure: Prisma repos, Redis adapters...".
// So Infra CAN use Redis.

import { RedisService } from '#src/infrastructure/redis/redis.service.js';

@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany();
    return roles.map((role) => this.toDomain(role));
  }

  async findById(id: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    return role ? this.toDomain(role) : null;
  }

  async findBySlug(slug: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    return role ? this.toDomain(role) : null;
  }

  async listUserRoleIds(userId: string): Promise<string[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        userRoles: { some: { userId } },
      },
      select: { id: true },
    });
    return roles.map((r) => r.id);
  }

  async listRolesForUser(userId: string): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        userRoles: { some: { userId } },
      },
    });
    return roles.map((role) => this.toDomain(role));
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
    await this.invalidateUserRoles(userId);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
    await this.invalidateUserRoles(userId);
  }

  async replaceUserRoles(userId: string, roleIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId, roleId })),
        });
      }
    });
    await this.invalidateUserRoles(userId);
  }

  async create(role: Role): Promise<Role> {
    try {
      const record = await this.prisma.role.create({
        data: {
          name: role.name,
          slug: role.slug,
          description: role.description,
          isSystem: role.isSystem,
        },
      });
      return this.toDomain(record);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw RbacException.roleAlreadyExists(role.slug);
      }
      throw error;
    }
  }

  async update(id: string, diff: Partial<Role>): Promise<Role> {
    try {
      const record = await this.prisma.role.update({
        where: { id },
        data: {
          ...diff,
          updatedAt: new Date(),
        },
      });
      return this.toDomain(record);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw RbacException.roleAlreadyExists(diff.slug || 'unknown');
      }
      // Handle RecordNotFound by Prisma
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    // Check usage
    const usage = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true, rolePerms: true },
        },
      },
    });

    if (!usage) {
      throw RbacException.roleNotFound(id);
    }

    if (usage._count.userRoles > 0 || usage._count.rolePerms > 0) {
      throw RbacException.roleInUse(id);
    }

    await this.prisma.role.delete({ where: { id } });
  }

  private async invalidateUserRoles(userId: string) {
    // Invalidate the specific user's roles cache
    const key = redisKeys.rbacRoles(userId);
    await this.redis.del(key);
    // We need RedisService or access to cache.
    // Since this is Repository (Infra), we can inject RedisService or use RequestContext.
    // Ideally Repositories should use CacheManagerPort if we want to be clean, OR rely on a Cache Service.
    // "Clean Architecture dependency direction: outer -> inner". Repo is outer.
    // Redis is also outer. Can Repo depend on Redis? Yes (Infra -> Infra).
    // I need to inject the Redis Client or Cache Manager.
  }

  private toDomain(record: any): Role {
    return new Role(
      record.id,
      record.name,
      record.slug,
      record.description,
      record.isSystem,
      record.createdAt,
      record.updatedAt,
    );
  }
}
