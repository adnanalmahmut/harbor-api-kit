import type { httpConfig, tenantConfig } from '#src/config/index.js';
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

  /** Per-request memo, the first tier behind `getOrLoad`. */
  cache?: Map<string, unknown>;

  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;

  user?: AuthenticatedUser;
  session?: AuthenticatedSession;
};

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * The per-request store, held in `AsyncLocalStorage` and reached through plain
 * functions rather than an injected port.
 *
 * There was a port here, plus an adapter, plus a @Global module to bind them —
 * five layers over a single ALS instance that is never swapped, and which the
 * pino mixin had to bypass anyway because it is constructed outside the
 * container. Guards, interceptors and the exception filter now import these
 * three functions directly.
 */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Mutates the current store if one is open. Never creates one. */
export function setRequestContext(patch: Partial<RequestContext>): void {
  const store = storage.getStore();
  if (store) Object.assign(store, patch);
}

export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

/**
 * Opens the store. Registered as a Fastify `onRequest` hook, the earliest point
 * every later stage — guards, interceptors, the exception filter, the logger —
 * can rely on it being there.
 */
export function createRequestContextHook(
  http: ConfigType<typeof httpConfig>,
  tenant: ConfigType<typeof tenantConfig>,
) {
  return function onRequest(
    req: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ) {
    const headerName = http.requestId.headerName;
    const requestId = (req.headers[headerName] as string) || randomUUID();

    reply.header(headerName, requestId);

    const tenantId = normalizeHeader(req.headers[tenant.headerName]);

    runWithRequestContext(
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
      },
      () => done(),
    );
  };
}
