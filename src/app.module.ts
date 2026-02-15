import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { PrismaModule } from '#src/core/infrastructure/db/prisma/prisma.module.js';
import { I18nSetupModule } from '#src/core/infrastructure/i18n/i18n-setup.module.js';
import { LoggerSetupModule } from '#src/core/infrastructure/logger/logger-setup.module.js';
import { RedisModule } from '#src/core/infrastructure/redis/redis.module.js';
import { RateLimitModule } from '#src/core/presentation/http/security/rate-limit/rate-limit.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
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
