import { PrismaService, redisKeys, RedisService } from '#src/core/index.js';
import { RbacException } from '#src/modules/rbac/application/exceptions/rbac.exception.js';
import { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaPermissionRepository implements PermissionRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listAll(): Promise<Permission[]> {
    try {
      const records = await this.prisma.permission.findMany();
      return records.map((r) => this.toDomain(r));
    } catch (error) {
      throw RbacException.databaseError({ originalError: error });
    }
  }

  async findById(id: string): Promise<Permission | null> {
    try {
      const record = await this.prisma.permission.findUnique({ where: { id } });
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw RbacException.databaseError({ id, originalError: error });
    }
  }

  async findByKey(action: string, subject: string): Promise<Permission | null> {
    try {
      const record = await this.prisma.permission.findUnique({
        where: {
          action_subject: {
            action,
            subject,
          },
        },
      });
      return record ? this.toDomain(record) : null;
    } catch (error) {
      throw RbacException.databaseError({
        action,
        subject,
        originalError: error,
      });
    }
  }

  async findManyByIds(ids: string[]): Promise<Permission[]> {
    try {
      const records = await this.prisma.permission.findMany({
        where: { id: { in: ids } },
      });
      return records.map((r) => this.toDomain(r));
    } catch (error) {
      throw RbacException.databaseError({ ids, originalError: error });
    }
  }

  async create(permission: Permission): Promise<Permission> {
    try {
      const record = await this.prisma.permission.create({
        data: {
          action: permission.action,
          subject: permission.subject,
          index: permission.index,
          description: permission.description,
        },
      });
      await this.redis.incr(redisKeys.rbacVersion());
      return this.toDomain(record);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw RbacException.permissionAlreadyExists(
          `${permission.subject}:${permission.action}`,
        );
      }
      throw RbacException.databaseError({ originalError: error });
    }
  }

  async update(id: string, diff: Partial<Permission>): Promise<Permission> {
    try {
      const record = await this.prisma.permission.update({
        where: { id },
        data: {
          ...diff,
          updatedAt: new Date(),
        },
      });
      await this.redis.incr(redisKeys.rbacVersion());
      return this.toDomain(record);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw RbacException.permissionAlreadyExists('unknown');
      }
      throw RbacException.databaseError({ id, originalError: error });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const usage = await this.prisma.permission.findUnique({
        where: { id },
        include: {
          _count: {
            select: { rolePerms: true, userPerms: true },
          },
        },
      });

      if (!usage) {
        throw RbacException.permissionNotFound(id);
      }

      if (usage._count.rolePerms > 0 || usage._count.userPerms > 0) {
        throw RbacException.permissionInUse(id);
      }

      await this.prisma.permission.delete({ where: { id } });
      await this.redis.incr(redisKeys.rbacVersion());
    } catch (error) {
      if (error instanceof RbacException) throw error;
      throw RbacException.databaseError({ id, originalError: error });
    }
  }

  private toDomain(record: any): Permission {
    return new Permission(
      record.id,
      record.action,
      record.subject,
      record.index,
      record.description,
      record.createdAt,
      record.updatedAt,
    );
  }
}
