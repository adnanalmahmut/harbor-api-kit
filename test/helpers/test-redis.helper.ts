import { RedisService } from '#src/infrastructure/redis/redis.service.js';

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
    'core-platform-api:*', // Also clear the prefix-based keys
    'test-api:*', // Test environment prefix from .env.test
  ];

  for (const pattern of patterns) {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
