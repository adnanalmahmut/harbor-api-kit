/** The auth module's Redis namespace, declared in one place. */
export const authCacheKeys = {
  session: (sessionId: string) => `auth:session:${sessionId}`,
  userSessions: (userId: string) => `auth:user:${userId}:sessions`,
} as const;
