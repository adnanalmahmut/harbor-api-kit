import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';

/**
 * Clear application cache keys from Redis without affecting BullMQ job data.
 * Uses patterns from redis.keys.ts: scp:auth:*, scp:rbac:*, scp:rl:*, scp:lock:*
 */
export async function clearRedisCache(redis: RedisService): Promise<void> {
  const client = redis.raw();
  const patterns = [
    'scp:auth:*',
    'scp:rbac:*',
    'scp:rl:*',
    'scp:lock:*',
    'test-api:auth:*',
    'test-api:rbac:*',
    'test-api:rl:*',
    'test-api:lock:*',
    'core-platform-api:auth:*',
    'core-platform-api:rbac:*',
  ];

  for (const pattern of patterns) {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
