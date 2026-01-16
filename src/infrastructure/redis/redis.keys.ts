export const redisKeys = {
  refreshLock: (familyId: string) => `lock:refresh:${familyId}`,
  userMinVersion: (userId: string) => `auth:user:${userId}:min_version`,

  // TODO: placeholders
  rbacBitset: (userId: string) => `rbac:user:${userId}:bitset`,
  rbacVersion: () => `rbac:version`,
} as const;
