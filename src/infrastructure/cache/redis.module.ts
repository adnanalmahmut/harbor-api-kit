import { redisConfig } from '#src/config/index.js';
import { Global, Module } from '@nestjs/common';
import { AppCacheService } from './app-cache.service.js';
import { CacheManagerPort } from './cache-manager.port.js';
import type { ConfigType } from '@nestjs/config';
import type { Redis as RedisClient } from 'ioredis';
import { RedisService } from './redis.service.js';

const REDIS_CLIENT = Symbol('REDIS_CLIENT');

type RedisCtor = new (url: string, options?: any) => RedisClient;

function resolveRedisCtor(mod: any): RedisCtor {
  // ioredis may come as a default export or as a module object
  return (mod?.default ?? mod) as RedisCtor;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [redisConfig.KEY],
      useFactory: async (config: ConfigType<typeof redisConfig>) => {
        const mod = await import('ioredis');
        const Redis = resolveRedisCtor(mod);

        return new Redis(config.url, {
          maxRetriesPerRequest: 20,
          enableReadyCheck: true,
        });
      },
    },
    {
      provide: RedisService,
      inject: [REDIS_CLIENT, redisConfig.KEY],
      useFactory: (
        client: RedisClient,
        config: ConfigType<typeof redisConfig>,
      ) => new RedisService(client, config.prefix),
    },
    { provide: CacheManagerPort, useExisting: RedisService },

    // The two-tier read-through cache over RequestContext.
    AppCacheService,
  ],
  exports: [RedisService, CacheManagerPort, AppCacheService],
})
export class RedisModule {}
