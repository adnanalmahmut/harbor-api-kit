import { redisKeys, RedisService } from '#src/core/index.js';
import { Role } from '#src/modules/rbac/domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CachedRoleRepository implements RoleRepositoryPort {
  private readonly TTL_SECONDS = 3600; // 1 hour

  constructor(
    @Inject(RBAC_TOKENS.ROLE_REPOSITORY_DELEGATE)
    private readonly delegate: RoleRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.delegate.findAll();
  }

  async findById(id: string): Promise<Role | null> {
    return this.delegate.findById(id);
  }

  async findBySlug(slug: string): Promise<Role | null> {
    const cacheKey = redisKeys.rbacRoleSlug(slug);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return this.deserialize(cached);
    }

    const role = await this.delegate.findBySlug(slug);
    if (role) {
      await this.redis.set(cacheKey, JSON.stringify(role), this.TTL_SECONDS);
    }
    return role;
  }

  async listUserRoleIds(userId: string): Promise<string[]> {
    const cacheKey = redisKeys.rbacRoles(userId); // Use standard key
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const ids = await this.delegate.listUserRoleIds(userId);
    await this.redis.set(cacheKey, JSON.stringify(ids), 300); // 5 mins
    return ids;
  }

  async listRolesForUser(userId: string): Promise<Role[]> {
    return this.delegate.listRolesForUser(userId);
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await this.delegate.assignRoleToUser(userId, roleId);
    await this.invalidateUserRoles(userId);
  }

  async replaceUserRoles(userId: string, roleIds: string[]): Promise<void> {
    await this.delegate.replaceUserRoles(userId, roleIds);
    await this.invalidateUserRoles(userId);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.delegate.removeRoleFromUser(userId, roleId);
    await this.invalidateUserRoles(userId);
  }

  async create(role: Role): Promise<Role> {
    return this.delegate.create(role);
  }

  async update(id: string, diff: Partial<Role>): Promise<Role> {
    const role = await this.delegate.update(id, diff);
    // Invalidate slug cache if slug changed
    if (diff.slug) {
      await this.redis.del(redisKeys.rbacRoleSlug(diff.slug));
    }
    return role;
  }

  async delete(id: string): Promise<void> {
    await this.delegate.delete(id);
  }

  private async invalidateUserRoles(userId: string) {
    await this.redis.del(redisKeys.rbacRoles(userId));
  }

  private deserialize(data: string): Role {
    const parsed = JSON.parse(data);
    return new Role(
      parsed.id,
      parsed.name,
      parsed.slug,
      parsed.description,
      parsed.isSystem,
      new Date(parsed.createdAt),
      new Date(parsed.updatedAt),
    );
  }
}
