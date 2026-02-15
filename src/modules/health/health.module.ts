import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { PrismaModule } from '#src/core/infrastructure/db/prisma/prisma.module.js';
import { RedisModule } from '#src/core/infrastructure/redis/redis.module.js';
import { RateLimitModule } from '#src/core/presentation/http/security/rate-limit/rate-limit.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { HealthController } from '#src/modules/health/health.controller.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    AppConfigModule,
    RateLimitModule,
    PrismaModule,
    RedisModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
