import {
  AppConfigModule,
  PrismaModule,
  RateLimitModule,
  RedisModule,
} from '#src/core/index.js';
import { Module } from '@nestjs/common';
import { HealthCheckerService } from './application/health-checker.service.js';
import type { CacheHealthPort, DbHealthPort } from './domain/index.js';
import { HEALTH_TOKENS } from './health.tokens.js';
import { PrismaDbHealthAdapter } from './infrastructure/prisma-db-health.adapter.js';
import { RedisCacheHealthAdapter } from './infrastructure/redis-cache-health.adapter.js';
import { HealthController } from './presentation/http/health.controller.js';

@Module({
  imports: [AppConfigModule, RateLimitModule, PrismaModule, RedisModule],
  controllers: [HealthController],
  providers: [
    PrismaDbHealthAdapter,
    RedisCacheHealthAdapter,
    {
      provide: HEALTH_TOKENS.DB_HEALTH,
      useExisting: PrismaDbHealthAdapter,
    },
    {
      provide: HEALTH_TOKENS.CACHE_HEALTH,
      useExisting: RedisCacheHealthAdapter,
    },
    {
      provide: HealthCheckerService,
      useFactory: (db: DbHealthPort, cache: CacheHealthPort) =>
        new HealthCheckerService(db, cache),
      inject: [HEALTH_TOKENS.DB_HEALTH, HEALTH_TOKENS.CACHE_HEALTH],
    },
  ],
})
export class HealthModule {}
