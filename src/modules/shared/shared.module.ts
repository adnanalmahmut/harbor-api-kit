import { AppCacheService, CORE_TOKENS } from '#src/core/index.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: AppCacheService,
      useFactory: () => new AppCacheService(),
    },
    {
      provide: CORE_TOKENS.APP_CACHE,
      useExisting: AppCacheService,
    },
  ],
  exports: [AppCacheService, CORE_TOKENS.APP_CACHE],
})
export class SharedModule {}
