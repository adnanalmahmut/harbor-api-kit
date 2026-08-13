import { Global, Module } from '@nestjs/common';
import {
  RequestContextStoreAdapter,
  RequestContextStorePort,
} from './request-context.js';

/**
 * The request-context store, global because filters, interceptors and guards
 * resolve it outside any feature module.
 */
@Global()
@Module({
  providers: [
    { provide: RequestContextStorePort, useClass: RequestContextStoreAdapter },
  ],
  exports: [RequestContextStorePort],
})
export class CommonModule {}
