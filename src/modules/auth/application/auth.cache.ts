export class AuthCacheKeys {
  static session = (sessionId: string) => `auth:session:${sessionId}`;
  static userMinVersion = (userId: string) => `auth:user:${userId}:min_version`;
  static userSessions = (userId: string) => `auth:user:${userId}:sessions`;
}
