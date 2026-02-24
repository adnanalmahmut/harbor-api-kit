import { PrismaService, redisKeys, RedisService } from '#src/core/index.js';
import { RbacException } from '#src/modules/rbac/application/exceptions/rbac.exception.js';
import { Role } from '#src/modules/rbac/domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<Role[]> {
    try {
      const roles = await this.prisma.role.findMany();
      return roles.map((role) => this.toDomain(role));
    } catch (error) {
      throw RbacException.databaseError({ originalError: error });
    }
  }

  async findById(id: string): Promise<Role | null> {
    try {
      const role = await this.prisma.role.findUnique({ where: { id } });
      return role ? this.toDomain(role) : null;
    } catch (error) {
      throw RbacException.databaseError({ id, originalError: error });
    }
  }

  async findBySlug(slug: string): Promise<Role | null> {
    try {
      const role = await this.prisma.role.findUnique({ where: { slug } });
      return role ? this.toDomain(role) : null;
    } catch (error) {
      throw RbacException.databaseError({ slug, originalError: error });
    }
  }

  async listUserRoleIds(userId: string): Promise<string[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: {
          userRoles: { some: { userId } },
        },
        select: { id: true },
      });
      return roles.map((r) => r.id);
    } catch (error) {
      throw RbacException.databaseError({ userId, originalError: error });
    }
  }

  async listRolesForUser(userId: string): Promise<Role[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: {
          userRoles: { some: { userId } },
        },
      });
      return roles.map((role) => this.toDomain(role));
    } catch (error) {
      throw RbacException.databaseError({ userId, originalError: error });
    }
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
        },
      });
      await this.invalidateUserRoles(userId);
    } catch (error) {
      throw RbacException.databaseError({
        userId,
        roleId,
        originalError: error,
      });
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
      });
      await this.invalidateUserRoles(userId);
    } catch (error) {
      throw RbacException.databaseError({
        userId,
        roleId,
        originalError: error,
      });
    }
  }

  async replaceUserRoles(userId: string, roleIds: string[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId, roleId })),
          });
        }
      });
      await this.invalidateUserRoles(userId);
    } catch (error) {
      throw RbacException.databaseError({
        userId,
        roleIds,
        originalError: error,
      });
    }
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
      await this.invalidateGlobalRbac();
      return this.toDomain(record);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw RbacException.roleAlreadyExists(role.slug);
      }
      throw RbacException.databaseError({ originalError: error });
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
      const updated = this.toDomain(record);
      // Changing a role affects all users with that role -> Global Bump
      await this.invalidateGlobalRbac();
      return updated;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw RbacException.roleAlreadyExists(diff.slug || 'unknown');
      }
      throw RbacException.databaseError({ id, originalError: error });
    }
  }

  async delete(id: string): Promise<void> {
    try {
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
      await this.invalidateGlobalRbac();
    } catch (error) {
      if (error instanceof RbacException) throw error;
      throw RbacException.databaseError({ id, originalError: error });
    }
  }

  private async invalidateUserRoles(userId: string) {
    // Only bump user-specific version for user role changes
    // Global rbacVersion is only bumped for role/permission definition changes
    await this.redis.incr(redisKeys.rbacUserVersion(userId));
  }

  private async invalidateGlobalRbac() {
    // Strategy A: Bump global version
    await this.redis.incr(redisKeys.rbacVersion());
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
