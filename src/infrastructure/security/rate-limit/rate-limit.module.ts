import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { RedisModule } from '#src/infrastructure/redis/redis.module.js';
import { RateLimitGuard } from '#src/infrastructure/security/rate-limit/rate-limit.guard.js';
import { SessionRateLimitInterceptor } from '#src/infrastructure/security/rate-limit/session-rate-limit.interceptor.js';
import { UserRateLimitInterceptor } from '#src/infrastructure/security/rate-limit/user-rate-limit.interceptor.js';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  imports: [AppConfigModule, RedisModule],

  providers: [
    // Global IP-based rate limiting (runs first, before auth)
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    // User-based rate limiting (runs after auth as interceptor)
    {
      provide: APP_INTERCEPTOR,
      useClass: UserRateLimitInterceptor,
    },
    // Session-based rate limiting (runs after auth as interceptor)
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionRateLimitInterceptor,
    },
    // Export for direct injection
    UserRateLimitInterceptor,
    SessionRateLimitInterceptor,
  ],

  exports: [UserRateLimitInterceptor, SessionRateLimitInterceptor],
})
export class RateLimitModule {}
