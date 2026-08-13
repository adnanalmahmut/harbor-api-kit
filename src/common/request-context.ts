import type { httpConfig, tenantConfig } from '#src/config/index.js';
import { AppCacheService } from '#src/infrastructure/cache/app-cache.service.js';
import type { CachePort } from '#src/infrastructure/cache/cache.port.js';
import { Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { normalizeHeader, stripQuery } from './utils.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export type RequestContext = {
  requestId?: string;
  method?: string;
  path?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  sessionToken?: string;
  userAgent?: string;
  locale?: string;
  startTimeMs?: number;

  tenantId?: string;

  cache?: Map<string, unknown>;

  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;

  redis?: CachePort;
  user?: AuthenticatedUser;
  session?: AuthenticatedSession;
};

export type CacheScope = 'request' | 'redis' | 'both';

/**
 * Low-level storage, based on `AsyncLocalStorage`.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Static getter, for the places DI cannot reach (e.g. the pino mixin).
 * Everywhere else, inject `RequestContextStorePort`.
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

/**
 * Opens the per-request store. Registered as a Fastify `onRequest` hook, which
 * is the earliest point every later stage (guards, interceptors, the exception
 * filter, the logger) can rely on.
 */
export function createRequestContextHook(
  http: ConfigType<typeof httpConfig>,
  tenant: ConfigType<typeof tenantConfig>,
  contextStore: RequestContextStorePort,
  redisService?: CachePort,
) {
  return function onRequest(
    req: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ) {
    const headerName = http.requestId.headerName;
    const requestId = (req.headers[headerName] as string) || randomUUID();

    reply.header(headerName, requestId);

    const tenantHeaderName = tenant.headerName;
    const tenantId = normalizeHeader(req.headers[tenantHeaderName]);

    contextStore.run(
      {
        requestId,
        tenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        headers: req.headers,
        method: req.method,
        path: stripQuery(req.url),
        startTimeMs: Date.now(),
        cache: new Map(),
        redis: redisService,
      },
      () => done(),
    );
  };
}
