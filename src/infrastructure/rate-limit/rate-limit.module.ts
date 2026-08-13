import { CacheModule } from '#src/infrastructure/cache/cache.module.js';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitInterceptor } from './rate-limit.interceptor.js';
import { RateLimiterPort, RedisRateLimiterAdapter } from './rate-limit.port.js';

/**
 * The whole rate-limiting capability: the port, its Redis-backed adapter, and
 * the single interceptor that consumes it for all three scopes.
 */
@Global()
@Module({
  imports: [CacheModule],
  providers: [
    RedisRateLimiterAdapter,
    { provide: RateLimiterPort, useExisting: RedisRateLimiterAdapter },
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
  ],
  exports: [RateLimiterPort],
})
export class RateLimitModule {}
