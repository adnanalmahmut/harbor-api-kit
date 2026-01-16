import { Module } from '@nestjs/common';
import { AppConfigModule } from './infrastructure/config/app-config.module.js';
import { PrismaModule } from './infrastructure/db/prisma/prisma.module.js';
import { I18nSetupModule } from './infrastructure/i18n/i18n-setup.module.js';
import { LoggerSetupModule } from './infrastructure/logger/logger-setup.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { RateLimitModule } from './infrastructure/security/rate-limit/rate-limit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PlaygroundModule } from './modules/playground/playground.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    LoggerSetupModule,
    I18nSetupModule,
    HealthModule,
    PlaygroundModule,
    AuthModule,
    RbacModule,
    UsersModule,
    RedisModule,
    RateLimitModule,
  ],
})
export class AppModule {}
