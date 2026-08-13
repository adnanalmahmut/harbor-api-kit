import { Global, Module } from '@nestjs/common';
import { RequestContextStoreAdapter } from './context/request-context.store.adapter.js';
import { RequestContextStorePort } from './context/request-context.store.js';

/**
 * The request-context store, global because filters, interceptors and guards
 * resolve it outside any feature module.
 *
 * `AppCacheService` is provided by `RedisModule` — it belongs to the cache
 * capability, which owns all of its own wiring.
 */
@Global()
@Module({
  providers: [
    { provide: RequestContextStorePort, useClass: RequestContextStoreAdapter },
  ],
  exports: [RequestContextStorePort],
})
export class CommonModule {}
