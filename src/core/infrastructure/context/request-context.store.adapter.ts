import { AppCacheService } from '#src/core/application/index.js';
import type {
  CacheScope,
  RequestContext,
  RequestContextStorePort,
} from '#src/core/domain/index.js';
import { Injectable } from '@nestjs/common';
import {
  getRequestContextStatic,
  requestContextStorage,
  setRequestContextStatic,
} from './request-context-storage.js';

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
