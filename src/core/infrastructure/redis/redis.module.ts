import { Global, Module } from '@nestjs/common';
import type { Redis as RedisClient } from 'ioredis';
import { AppConfigModule } from '../config/app-config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
import { RedisService } from './redis.service.js';

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
          maxRetriesPerRequest: 20,
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
