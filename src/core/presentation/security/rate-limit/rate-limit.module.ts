import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { RateLimiterModule } from '#src/core/infrastructure/rate-limit/rate-limiter.module.js';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitInterceptor } from './rate-limit.interceptor.js';
import { SessionRateLimitInterceptor } from './session-rate-limit.interceptor.js';
import { UserRateLimitInterceptor } from './user-rate-limit.interceptor.js';

@Global()
@Module({
  imports: [AppConfigModule, RateLimiterModule],

  providers: [
    // Global hybrid rate limiting (userId if available, otherwise IP)
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    // User-based rate limiting (opt-in per route via decorator)
    {
      provide: APP_INTERCEPTOR,
      useClass: UserRateLimitInterceptor,
    },
    // Session-based rate limiting (opt-in per route via decorator)
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
