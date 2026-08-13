import { GrantEffect } from '#src/generated/prisma/enums.js';
import { AuthorizationException } from '#src/modules/authorization/authorization.exception.js';
import {
  AuthorizationRepository,
  type PermissionOverrideInput,
} from '#src/modules/authorization/authorization.repository.js';
import { PermissionKeyVO } from '#src/modules/authorization/permission-key.vo.js';
import { UserPermissionOverride } from '#src/modules/authorization/user-permission-override.js';
import { Injectable } from '@nestjs/common';
import { isRecordNotFound } from './prisma-error.mapper.js';
import { PrismaTransactionManager } from './prisma-transaction.manager.js';

@Injectable()
export class PrismaAuthorizationRepository extends AuthorizationRepository {
  constructor(private readonly db: PrismaTransactionManager) {
    super();
  }

  /** Transaction-aware: the transactional client while inside `run`. */
  private get prisma() {
    return this.db.client;
  }

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
      // The override does not exist — a client error, not a database failure.
      if (isRecordNotFound(error)) {
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
      // Through the port, not `$transaction`: `this.prisma` resolves to the
      // transactional client for the duration of the callback.
      await this.db.run(async () => {
        await this.prisma.userPermission.deleteMany({ where: { userId } });
        if (overrides.length === 0) return;
        await this.prisma.userPermission.createMany({
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
