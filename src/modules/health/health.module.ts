import {
  AppConfigModule,
  PrismaModule,
  RateLimitModule,
  RedisModule,
} from '#src/core/index.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { HealthController } from './health.controller.js';
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
