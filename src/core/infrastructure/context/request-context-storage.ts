import type { RequestContext } from '#src/core/domain/index.js';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Low-level storage for RequestContext based on AsyncLocalStorage.
 * This file belongs to Infrastructure as it uses Node.js specific APIs.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Static getter for RequestContext.
 * Use RequestContextStorePort via DI in Application/Presentation layers.
 * Use this only in Infrastructure where DI is not available (e.g. Logger mixins).
 */
export function getRequestContextStatic(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Mutates the current request store (if present). Does not create a store.
 */
export function setRequestContextStatic(patch: Partial<RequestContext>) {
  const store = requestContextStorage.getStore();
  if (store) Object.assign(store, patch);
}
