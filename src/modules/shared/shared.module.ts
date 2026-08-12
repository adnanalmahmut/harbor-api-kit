import {
  AppCacheService,
  CORE_TOKENS,
  RequestContextStoreAdapter,
} from '#src/core/index.js';
import { Global, Module } from '@nestjs/common';

@Global()
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
    {
      provide: CORE_TOKENS.REQUEST_CONTEXT_STORE,
      useClass: RequestContextStoreAdapter,
    },
  ],
  exports: [
    AppCacheService,
    CORE_TOKENS.APP_CACHE,
    CORE_TOKENS.REQUEST_CONTEXT_STORE,
  ],
})
export class SharedModule {}
