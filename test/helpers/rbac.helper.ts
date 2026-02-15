import { PrismaService } from '#src/core/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
import { clearRedisCache } from './test-redis.helper.js';

export class RbacHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createRole(name: string, slug: string): Promise<string> {
    const role = await this.prisma.role.create({
      data: { name, slug, description: `${name} Role` },
    });
    return role.id;
  }

  async createPermission(subject: string, action: string): Promise<string> {
    const perm = await this.prisma.permission.create({
      data: {
        subject,
        action,
        description: `${action} ${subject}`,
        index: Math.floor(Math.random() * 1000000000) + 1,
      },
    });
    return perm.id;
  }

  async getPermission(subject: string, action: string) {
    return this.prisma.permission.findUnique({
      where: {
        action_subject: {
          action,
          subject,
        },
      },
    });
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.create({
      data: { userId, roleId },
    });
    await clearRedisCache(this.redis);
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
    });
    await clearRedisCache(this.redis);
  }

  async assignUserPermissionOverride(
    userId: string,
    permissionId: string,
    effect: 'ALLOW' | 'DENY',
  ): Promise<void> {
    await this.prisma.userPermission.create({
      data: {
        userId,
        permissionId,
        effect,
      },
    });
    await clearRedisCache(this.redis);
  }
}
