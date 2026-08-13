import { RedisService } from '#src/infrastructure/cache/redis.service.js';

/**
 * Clear application cache keys from Redis without affecting BullMQ job data.
 * Uses the Redis prefix configured for the current environment.
 */
export async function clearRedisCache(redis: RedisService): Promise<void> {
  await Promise.all([
    redis.deleteByPattern('auth:*'),
    redis.deleteByPattern('authorization:*'),
    redis.deleteByPattern('rl:*'),
    // Better Auth's own namespace: session records, the per-user session index
    // and its rate-limit counters. These live in Redis now that it is wired as
    // secondary storage, so a suite that does not clear them inherits the
    // previous suite's sign-in budget.
    redis.deleteByPattern('ba:*'),
    redis.deleteByPattern('lock:*'),
  ]);
}
