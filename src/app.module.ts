import {
  I18nSetupModule,
  LoggerSetupModule,
  PrismaModule,
  RateLimitModule,
  RedisModule,
} from '#src/core/index.js';
import { ConfigurationModule } from '#src/config/index.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { FilesModule } from '#src/modules/files/files.module.js';
import { HealthModule } from '#src/modules/health/health.module.js';
import { SharedModule } from '#src/modules/shared/shared.module.js';
import { UsersModule } from '#src/modules/users/users.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigurationModule,
    PrismaModule,
    LoggerSetupModule,
    I18nSetupModule,
    SharedModule,
    AuthModule,
    HealthModule,
    AuthorizationModule,
    UsersModule,
    RedisModule,
    RateLimitModule,
    FilesModule,
  ],
})
export class AppModule {}
