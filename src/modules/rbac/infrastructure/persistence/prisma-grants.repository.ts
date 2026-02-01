import { GrantEffect } from '#src/generated/prisma/enums.js';
import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { redisKeys } from '#src/infrastructure/redis/redis.keys.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import { PermissionKeyVO } from '#src/modules/rbac/domain/value-objects/permission-key.vo.js';
import { UserPermissionOverride } from '#src/modules/rbac/domain/value-objects/user-permission-override.vo.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaGrantsRepository implements GrantsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listPermissionsForRoleIds(roleIds: string[]): Promise<Permission[]> {
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });

    return rolePerms.map((rp) => this.toPermissionDomain(rp.permission));
  }

  async listUserOverrides(userId: string): Promise<{
    allow: UserPermissionOverride[];
    deny: UserPermissionOverride[];
  }> {
    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    const allow: UserPermissionOverride[] = [];
    const deny: UserPermissionOverride[] = [];

    for (const up of userPerms) {
      const vo = new UserPermissionOverride(
        PermissionKeyVO.fromParts(up.permission.subject, up.permission.action),
        up.effect === GrantEffect.ALLOW ? 'ALLOW' : 'DENY',
        up.note ?? undefined,
      );

      if (up.effect === GrantEffect.ALLOW) {
        allow.push(vo);
      } else {
        deny.push(vo);
      }
    }

    return { allow, deny };
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
    // Invalidate global version because Role Definitions changed
    await this.redis.incr(redisKeys.rbacVersion());
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
    await this.redis.incr(redisKeys.rbacVersion());
  }

  async setUserPermissionOverride(
    userId: string,
    permissionId: string,
    effect: 'ALLOW' | 'DENY',
  ): Promise<void> {
    await this.prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      create: {
        userId,
        permissionId,
        effect: effect === 'ALLOW' ? GrantEffect.ALLOW : GrantEffect.DENY,
      },
      update: {
        effect: effect === 'ALLOW' ? GrantEffect.ALLOW : GrantEffect.DENY,
      },
    });
    // Invalidate User Specific Cache
    await this.redis.del(redisKeys.rbacPermissions(userId));
  }

  async removeUserPermissionOverride(
    userId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });
    await this.redis.del(redisKeys.rbacPermissions(userId));
  }

  async replaceRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        });
      }
    });
    await this.redis.incr(redisKeys.rbacVersion());
  }

  async replaceUserPermissions(
    userId: string,
    overrides: {
      permissionId: string;
      effect: 'ALLOW' | 'DENY';
      note?: string;
    }[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      if (overrides.length > 0) {
        await tx.userPermission.createMany({
          data: overrides.map((o) => ({
            userId,
            permissionId: o.permissionId,
            effect: o.effect === 'ALLOW' ? GrantEffect.ALLOW : GrantEffect.DENY,
            note: o.note,
          })),
        });
      }
    });

    await this.redis.del(redisKeys.rbacPermissions(userId));
  }

  private toPermissionDomain(record: any): Permission {
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
