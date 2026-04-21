import { CORE_TOKENS } from '#src/core/core.tokens.js';
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { RedisRateLimiterAdapter } from './redis-rate-limiter.adapter.js';

@Module({
  imports: [RedisModule],
  providers: [
    RedisRateLimiterAdapter,
    {
      provide: CORE_TOKENS.RATE_LIMITER,
      useExisting: RedisRateLimiterAdapter,
    },
  ],
  exports: [CORE_TOKENS.RATE_LIMITER],
})
export class RateLimiterModule {}
