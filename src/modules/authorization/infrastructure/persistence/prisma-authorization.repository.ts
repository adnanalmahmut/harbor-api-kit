import { PrismaService } from '#src/core/index.js';
import { GrantEffect } from '#src/generated/prisma/enums.js';
import { AuthorizationException } from '../../application/exceptions/authorization.exception.js';
import type {
  AuthorizationRepositoryPort,
  PermissionOverrideInput,
} from '../../domain/ports/authorization.repository.port.js';
import { PermissionKeyVO } from '../../domain/value-objects/permission-key.vo.js';
import { UserPermissionOverride } from '../../domain/value-objects/user-permission-override.vo.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaAuthorizationRepository implements AuthorizationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getUserRole(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      return user?.role ?? null;
    } catch {
      throw AuthorizationException.databaseError({ userId });
    }
  }

  async listUserOverrides(userId: string): Promise<{
    allow: UserPermissionOverride[];
    deny: UserPermissionOverride[];
  }> {
    try {
      const records = await this.prisma.userPermission.findMany({
        where: { userId },
        orderBy: { permissionKey: 'asc' },
      });
      const allow: UserPermissionOverride[] = [];
      const deny: UserPermissionOverride[] = [];

      for (const record of records) {
        const override = new UserPermissionOverride(
          PermissionKeyVO.parse(record.permissionKey),
          record.effect === GrantEffect.ALLOW ? 'ALLOW' : 'DENY',
          record.note ?? undefined,
        );
        (override.effect === 'ALLOW' ? allow : deny).push(override);
      }

      return { allow, deny };
    } catch {
      throw AuthorizationException.databaseError({ userId });
    }
  }

  async setUserPermissionOverride(
    userId: string,
    override: PermissionOverrideInput,
  ): Promise<void> {
    try {
      await this.prisma.userPermission.upsert({
        where: {
          userId_permissionKey: {
            userId,
            permissionKey: override.permissionKey,
          },
        },
        create: {
          userId,
          permissionKey: override.permissionKey,
          effect: this.toPrismaEffect(override.effect),
          note: override.note,
        },
        update: {
          effect: this.toPrismaEffect(override.effect),
          note: override.note,
        },
      });
    } catch {
      throw AuthorizationException.databaseError({
        userId,
        permissionKey: override.permissionKey,
      });
    }
  }

  async removeUserPermissionOverride(
    userId: string,
    permissionKey: string,
  ): Promise<void> {
    try {
      await this.prisma.userPermission.delete({
        where: { userId_permissionKey: { userId, permissionKey } },
      });
    } catch (error) {
      // P2025: the override does not exist — a client error, not a database failure.
      if ((error as { code?: string })?.code === 'P2025') {
        throw AuthorizationException.permissionOverrideNotFound(permissionKey);
      }
      throw AuthorizationException.databaseError({
        userId,
        permissionKey,
      });
    }
  }

  async replaceUserPermissions(
    userId: string,
    overrides: PermissionOverrideInput[],
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.userPermission.deleteMany({ where: { userId } });
        if (overrides.length === 0) return;
        await transaction.userPermission.createMany({
          data: overrides.map((override) => ({
            userId,
            permissionKey: override.permissionKey,
            effect: this.toPrismaEffect(override.effect),
            note: override.note,
          })),
        });
      });
    } catch {
      throw AuthorizationException.databaseError({ userId });
    }
  }

  private toPrismaEffect(effect: 'ALLOW' | 'DENY'): GrantEffect {
    return effect === 'ALLOW' ? GrantEffect.ALLOW : GrantEffect.DENY;
  }
}
