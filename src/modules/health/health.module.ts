import { RateLimitModule } from '#src/infrastructure/rate-limit/rate-limit.module.js';
import { CacheModule } from '#src/infrastructure/cache/cache.module.js';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { CacheHealthPort } from './health.ports.js';
import { HealthService } from './health.service.js';
import { RedisCacheHealthAdapter } from './redis-cache-health.adapter.js';

// `DbHealthPort` is provided globally by PersistenceModule.
@Module({
  imports: [RateLimitModule, CacheModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: CacheHealthPort, useClass: RedisCacheHealthAdapter },
  ],
})
export class HealthModule {}
