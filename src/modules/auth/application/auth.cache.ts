export class AuthCacheKeys {
  static session = (sessionId: string) => `auth:session:${sessionId}`;
  static userSessions = (userId: string) => `auth:user:${userId}:sessions`;
}
