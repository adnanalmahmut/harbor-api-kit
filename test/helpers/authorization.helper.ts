import { RedisService } from '#src/infrastructure/cache/redis.service.js';
import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import type { PermissionKey } from '#src/modules/authorization/permissions.catalog.js';
import { clearRedisCache } from './test-redis.helper.js';

export class AuthorizationHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

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
