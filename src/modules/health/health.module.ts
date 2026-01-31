import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { RateLimitModule } from '#src/infrastructure/security/rate-limit/rate-limit.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { HealthController } from '#src/modules/health/health.controller.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule, RbacModule, AppConfigModule, RateLimitModule],
  controllers: [HealthController],
})
export class HealthModule {}
