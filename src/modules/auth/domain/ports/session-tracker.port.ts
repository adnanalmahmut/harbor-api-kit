export abstract class SessionTrackerPort {
  abstract trackSession(userId: string, cacheKey: string): Promise<void>;
}
