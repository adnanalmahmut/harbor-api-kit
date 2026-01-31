import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { RedisModule } from '#src/infrastructure/redis/redis.module.js';
import { RateLimitGuard } from '#src/infrastructure/security/rate-limit/rate-limit.guard.js';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

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
