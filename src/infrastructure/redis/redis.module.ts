import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { Global, Module } from '@nestjs/common';
import type { Redis as RedisClient } from 'ioredis';

const REDIS_CLIENT = Symbol('REDIS_CLIENT');

type RedisCtor = new (url: string, options?: any) => RedisClient;

function resolveRedisCtor(mod: any): RedisCtor {
  // ioredis may come as a default export or as a module object
  return (mod?.default ?? mod) as RedisCtor;
}

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: async (cfg: AppConfigService) => {
        const mod = await import('ioredis');
        const Redis = resolveRedisCtor(mod);

        const { url } = cfg.redis();
        return new Redis(url, {
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
        });
      },
    },
    {
      provide: RedisService,
      inject: [REDIS_CLIENT, AppConfigService],
      useFactory: (client: RedisClient, cfg: AppConfigService) => {
        const { prefix } = cfg.redis();
        return new RedisService(client, prefix);
      },
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
