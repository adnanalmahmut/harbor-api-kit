import { CacheModule } from '#src/infrastructure/cache/cache.module.js';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitInterceptor } from './rate-limit.interceptor.js';
import { RateLimiterPort } from './rate-limiter.port.js';
import { RedisRateLimiterAdapter } from './redis-rate-limiter.adapter.js';
import { SessionRateLimitInterceptor } from './session-rate-limit.interceptor.js';
import { UserRateLimitInterceptor } from './user-rate-limit.interceptor.js';

/**
 * The whole rate-limiting capability: the port, its Redis-backed adapter, and
 * the three interceptors that consume it.
 *
 * Previously split across two modules in two directories — `RateLimiterModule`
 * bound the port, `RateLimitModule` registered the interceptors and imported
 * the first. Nothing else ever imported `RateLimiterModule`, so the split
 * bought nothing.
 */
@Global()
@Module({
  imports: [CacheModule],
  providers: [
    RedisRateLimiterAdapter,
    { provide: RateLimiterPort, useExisting: RedisRateLimiterAdapter },

    // Global hybrid rate limiting (userId if available, otherwise IP)
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
    // User-based rate limiting (opt-in per route via decorator)
    { provide: APP_INTERCEPTOR, useClass: UserRateLimitInterceptor },
    // Session-based rate limiting (opt-in per route via decorator)
    { provide: APP_INTERCEPTOR, useClass: SessionRateLimitInterceptor },

    // Exported for direct injection
    UserRateLimitInterceptor,
    SessionRateLimitInterceptor,
  ],
  exports: [
    RateLimiterPort,
    UserRateLimitInterceptor,
    SessionRateLimitInterceptor,
  ],
})
export class RateLimitModule {}
