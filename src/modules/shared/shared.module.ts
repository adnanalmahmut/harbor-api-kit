import { AppCacheService } from '#src/modules/shared/application/services/app-cache.service.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: AppCacheService,
      useFactory: () => new AppCacheService(),
    },
  ],
  exports: [AppCacheService],
})
export class SharedModule {}
