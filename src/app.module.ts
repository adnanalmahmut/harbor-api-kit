import {
  AppConfigModule,
  I18nSetupModule,
  LoggerSetupModule,
  PrismaModule,
  RateLimitModule,
  RedisModule,
} from '#src/core/index.js';
import { AuthModule } from '#src/modules/auth/index.js';
import { FilesModule } from '#src/modules/files/files.module.js';
import { HealthModule } from '#src/modules/health/health.module.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { UsersModule } from '#src/modules/users/users.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    LoggerSetupModule,
    I18nSetupModule,
    AuthModule,
    HealthModule,
    RbacModule,
    UsersModule,
    RedisModule,
    RateLimitModule,
    FilesModule,
  ],
})
export class AppModule {}
