import type { RequestContext } from '#src/core/context/request-context.type.js';

export type CacheScope = 'request' | 'redis' | 'both';

export interface RequestContextStorePort {
  get(): RequestContext | undefined;
  set(patch: Partial<RequestContext>): void;
  getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number,
    scope?: CacheScope,
  ): Promise<T>;
}
