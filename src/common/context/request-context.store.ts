import type { RequestContext } from './request-context.type.js';

export type CacheScope = 'request' | 'redis' | 'both';

/**
 * Abstract class rather than an interface so it doubles as the DI token.
 */
export abstract class RequestContextStorePort {
  abstract get(): RequestContext | undefined;
  abstract set(patch: Partial<RequestContext>): void;
  abstract run<T>(context: RequestContext, fn: () => T): T;
  abstract getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number,
    scope?: CacheScope,
  ): Promise<T>;
}
