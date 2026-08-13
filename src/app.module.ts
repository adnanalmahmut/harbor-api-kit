import { ConfigurationModule } from '#src/config/index.js';
import { RateLimitModule } from '#src/infrastructure/rate-limit/rate-limit.module.js';
import { I18nModule } from '#src/infrastructure/i18n/i18n.module.js';
import { LoggerModule } from '#src/infrastructure/logger/logger.module.js';
import { CacheModule } from '#src/infrastructure/cache/cache.module.js';
import { PersistenceModule } from '#src/persistence/persistence.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { FilesModule } from '#src/modules/files/files.module.js';
import { HealthModule } from '#src/modules/health/health.module.js';
import { CommonModule } from '#src/common/common.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigurationModule,
    PersistenceModule,
    LoggerModule,
    I18nModule,
    CommonModule,
    AuthModule,
    HealthModule,
    AuthorizationModule,
    CacheModule,
    RateLimitModule,
    FilesModule,
  ],
})
export class AppModule {}
