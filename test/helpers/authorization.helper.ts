import { PrismaService, RedisService } from '#src/core/index.js';
import type { PermissionKey, RoleName } from '#src/modules/authorization/index.js';
import { clearRedisCache } from './test-redis.helper.js';

export class AuthorizationHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async assignRoleToUser(userId: string, role: RoleName): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    await clearRedisCache(this.redis);
  }

  async assignUserPermissionOverride(
    userId: string,
    permissionKey: PermissionKey,
    effect: 'ALLOW' | 'DENY',
  ): Promise<void> {
    await this.prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId, permissionKey } },
      update: { effect },
      create: { userId, permissionKey, effect },
    });
    await clearRedisCache(this.redis);
  }
}
