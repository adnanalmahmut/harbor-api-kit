export const AuthCacheKeys = {
  session: (sessionId: string) => `auth:session:${sessionId}`,
  userMinVersion: (userId: string) => `auth:user:${userId}:min_version`,
  userSessions: (userId: string) => `auth:user:${userId}:sessions`,
};
