export const rbacCacheKeys = {
  rbacRoles: (userId: string) => `rbac:user:${userId}:roles`,
  rbacPermissions: (userId: string) => `rbac:user:${userId}:permissions`,
  rbacVersion: () => `rbac:version`,
  rbacRoleSlug: (slug: string) => `rbac:role:slug:${slug}`,
} as const;
