export const CachePrefix = 'scp';

export const rbacCacheKeys = {
  rbacRoles: (userId: string) => `${CachePrefix}:rbac:user:${userId}:roles`,
  rbacPermissions: (userId: string) =>
    `${CachePrefix}:rbac:user:${userId}:permissions`,
  rbacVersion: () => `${CachePrefix}:rbac:version`,
  rbacRoleSlug: (slug: string) => `${CachePrefix}:rbac:role:slug:${slug}`,
} as const;
