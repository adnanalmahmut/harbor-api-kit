import { AppCacheService } from '#src/core/application/services/app-cache.service.js';
import type { RequestContext } from '#src/core/domain/context/request-context.type.js';
import type {
  CacheScope,
  RequestContextStorePort,
} from '#src/core/domain/ports/request-context.store.port.js';
import {
  getRequestContextStatic,
  requestContextStorage,
  setRequestContextStatic,
} from '#src/core/infrastructure/context/request-context-storage.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RequestContextStoreAdapter implements RequestContextStorePort {
  constructor(private readonly appCache: AppCacheService) {}

  get(): RequestContext | undefined {
    return getRequestContextStatic();
  }

  set(patch: Partial<RequestContext>): void {
    setRequestContextStatic(patch);
  }

  run<T>(context: RequestContext, fn: () => T): T {
    return requestContextStorage.run(context, fn);
  }

  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number,
    scope?: CacheScope,
  ): Promise<T> {
    const ctx = this.get();
    return this.appCache.getOrLoad(
      ctx as RequestContext,
      key,
      loader,
      ttlSeconds,
      scope,
    );
  }
}
