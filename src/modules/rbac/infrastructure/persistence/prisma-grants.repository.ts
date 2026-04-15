import { PrismaService, redisKeys, RedisService } from '#src/core/index.js';
import { GrantEffect } from '#src/generated/prisma/enums.js';
import { RbacException } from '../../application/exceptions/rbac.exception.js';
import { Permission } from '../../domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import { PermissionKeyVO } from '../../domain/value-objects/permission-key.vo.js';
import { UserPermissionOverride } from '../../domain/value-objects/user-permission-override.vo.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaGrantsRepository implements GrantsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listPermissionsForRoleIds(roleIds: string[]): Promise<Permission[]> {
    try {
      const rolePerms = await this.prisma.rolePermission.findMany({
        where: { roleId: { in: roleIds } },
        include: { permission: true },
      });

      return rolePerms.map((rp) => this.toPermissionDomain(rp.permission));
    } catch (error) {
      throw RbacException.databaseError({ roleIds, originalError: error });
    }
  }

  async listUserOverrides(userId: string): Promise<{
    allow: UserPermissionOverride[];
    deny: UserPermissionOverride[];
  }> {
    try {
      const userPerms = await this.prisma.userPermission.findMany({
        where: { userId },
        include: { permission: true },
      });

      const allow: UserPermissionOverride[] = [];
      const deny: UserPermissionOverride[] = [];

      for (const up of userPerms) {
        const vo = new UserPermissionOverride(
          PermissionKeyVO.fromParts(
            up.permission.subject,
            up.permission.action,
          ),
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
    } catch (error) {
      throw RbacException.databaseError({ userId, originalError: error });
    }
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    try {
      await this.prisma.rolePermission.create({
        data: {
          roleId,
          permissionId,
        },
      });
      // Role perm change -> Global Bump
      await this.redis.incr(redisKeys.rbacVersion());
    } catch (error) {
      throw RbacException.databaseError({
        roleId,
        permissionId,
        originalError: error,
      });
    }
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    try {
      await this.prisma.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
      });
      // Role perm change -> Global Bump
      await this.redis.incr(redisKeys.rbacVersion());
    } catch (error) {
      throw RbacException.databaseError({
        roleId,
        permissionId,
        originalError: error,
      });
    }
  }

  async setUserPermissionOverride(
    userId: string,
    permissionId: string,
    effect: 'ALLOW' | 'DENY',
  ): Promise<void> {
    try {
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
      // User override -> User Bump
      await Promise.all([
        this.redis.incr(redisKeys.rbacUserVersion(userId)),
        this.redis.incr(redisKeys.rbacVersion()),
      ]);
    } catch (error) {
      throw RbacException.databaseError({
        userId,
        permissionId,
        effect,
        originalError: error,
      });
    }
  }

  async removeUserPermissionOverride(
    userId: string,
    permissionId: string,
  ): Promise<void> {
    try {
      await this.prisma.userPermission.delete({
        where: {
          userId_permissionId: {
            userId,
            permissionId,
          },
        },
      });
      // User override -> User Bump
      await Promise.all([
        this.redis.incr(redisKeys.rbacUserVersion(userId)),
        this.redis.incr(redisKeys.rbacVersion()),
      ]);
    } catch (error) {
      throw RbacException.databaseError({
        userId,
        permissionId,
        originalError: error,
      });
    }
  }

  async replaceRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          });
        }
      });
      // Role perm change -> Global Bump
      await this.redis.incr(redisKeys.rbacVersion());
    } catch (error) {
      throw RbacException.databaseError({
        roleId,
        permissionIds,
        originalError: error,
      });
    }
  }

  async replaceUserPermissions(
    userId: string,
    overrides: {
      permissionId: string;
      effect: 'ALLOW' | 'DENY';
      note?: string;
    }[],
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userPermission.deleteMany({ where: { userId } });
        if (overrides.length > 0) {
          await tx.userPermission.createMany({
            data: overrides.map((o) => ({
              userId,
              permissionId: o.permissionId,
              effect:
                o.effect === 'ALLOW' ? GrantEffect.ALLOW : GrantEffect.DENY,
              note: o.note,
            })),
          });
        }
      });
      // User override -> User Bump
      await Promise.all([
        this.redis.incr(redisKeys.rbacUserVersion(userId)),
        this.redis.incr(redisKeys.rbacVersion()),
      ]);
    } catch (error) {
      throw RbacException.databaseError({
        userId,
        overrides,
        originalError: error,
      });
    }
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
