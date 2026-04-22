import { RedisService } from '#src/core/index.js';
import { AuthCacheKeys } from '../../application/index.js';
import type { PinoLogger } from 'nestjs-pino';

export async function invalidateUserSessions(
  userId: string,
  redisService: RedisService,
  logger: PinoLogger,
): Promise<void> {
  const userSessionsKeyRaw = AuthCacheKeys.userSessions(userId);
  const userSessionsKey = redisService.key(userSessionsKeyRaw);

  logger.info({ userId }, 'Invalidating user sessions');

  const keys = await redisService.raw().smembers(userSessionsKey);

  if (keys.length > 0) {
    logger.debug({ count: keys.length }, 'Deleting cached session keys');
    await redisService.raw().del(...keys);
  }

  await redisService.raw().del(userSessionsKey);
}

export async function invalidateAllSessions(
  redisService: RedisService,
): Promise<void> {
  const pattern = AuthCacheKeys.session('*');
  await redisService.deleteByPattern(pattern);
}
