import { RedisService } from '#src/core/index.js';

/**
 * Clear application cache keys from Redis without affecting BullMQ job data.
 * Uses the Redis prefix configured for the current environment.
 */
export async function clearRedisCache(redis: RedisService): Promise<void> {
  await Promise.all([
    redis.deleteByPattern('auth:*'),
    redis.deleteByPattern('authorization:*'),
    redis.deleteByPattern('rl:*'),
    redis.deleteByPattern('lock:*'),
  ]);
}
