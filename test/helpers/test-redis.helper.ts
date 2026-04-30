import { RedisService } from '#src/core/index.js';

/**
 * Clear application cache keys from Redis without affecting BullMQ job data.
 * Uses patterns from redis.keys.ts: hak:auth:*, hak:rbac:*, hak:rl:*, hak:lock:*
 */
export async function clearRedisCache(redis: RedisService): Promise<void> {
  const client = redis.raw();
  const patterns = [
    'hak:auth:*',
    'hak:rbac:*',
    'hak:rl:*',
    'hak:lock:*',
    'test-api:auth:*',
    'test-api:rbac:*',
    'test-api:rl:*',
    'test-api:lock:*',
    'harbor-api-kit:auth:*',
    'harbor-api-kit:rbac:*',
  ];

  for (const pattern of patterns) {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
