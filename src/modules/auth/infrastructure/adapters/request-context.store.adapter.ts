import type { RequestContext } from '#src/core/context/request-context.type.js';
import {
  getRequestContext,
  setRequestContext,
  type CacheScope,
} from '#src/infrastructure/context/request-context.manager.js';
import type { RequestContextStorePort } from '#src/modules/auth/application/ports/request-context.store.port.js';
import { AppCacheService } from '#src/modules/shared/application/services/app-cache.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RequestContextStoreAdapter implements RequestContextStorePort {
  constructor(private readonly appCache: AppCacheService) {}

  get(): RequestContext | undefined {
    return getRequestContext();
  }

  set(patch: Partial<RequestContext>): void {
    setRequestContext(patch);
  }

  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number,
    scope?: CacheScope,
  ): Promise<T> {
    const ctx = this.get();
    // Use non-null assertion or let service handle undefined (it handles it)
    return this.appCache.getOrLoad(
      ctx as RequestContext,
      key,
      loader,
      ttlSeconds,
      scope,
    );
  }
}
