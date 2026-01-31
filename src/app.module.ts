import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { PrismaModule } from '#src/infrastructure/db/prisma/prisma.module.js';
import { I18nSetupModule } from '#src/infrastructure/i18n/i18n-setup.module.js';
import { LoggerSetupModule } from '#src/infrastructure/logger/logger-setup.module.js';
import { RedisModule } from '#src/infrastructure/redis/redis.module.js';
import { RateLimitModule } from '#src/infrastructure/security/rate-limit/rate-limit.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
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
  ],
})
export class AppModule {}
