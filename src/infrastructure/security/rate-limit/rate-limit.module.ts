import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { RedisModule } from '#src/infrastructure/redis/redis.module.js';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard.js';

@Global()
@Module({
  imports: [AppConfigModule, RedisModule],

  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class RateLimitModule {}
