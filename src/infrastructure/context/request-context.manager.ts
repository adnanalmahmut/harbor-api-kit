import type { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { stripQuery } from '#src/infrastructure/validation/http.utils.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';

import { AsyncLocalStorage } from 'node:async_hooks';
import { normalizeHeader } from '../i18n/i18n-helpers.js';

type RequestContext = {
  requestId: string;
  method?: string;
  path?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  locale?: string;
  startTimeMs?: number;

  tenantId?: string;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

export function setRequestContext(patch: Partial<RequestContext>) {
  const store = requestContext.getStore();
  if (store) Object.assign(store, patch);
}

export function getTenantId(): string | undefined {
  return requestContext.getStore()?.tenantId;
}

export function requireTenantId(): string {
  const t = getTenantId();
  if (!t) throw new Error('Missing tenantId in RequestContext');
  return t;
}

export function runWithRequestContext<T>(
  initial: RequestContext,
  fn: () => T,
): T {
  return requestContext.run(initial, fn);
}

export function createRequestContextHook(config: AppConfigService) {
  return function onRequest(
    req: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ) {
    const headerName = config.requestId().headerName;
    const requestId = (req.headers[headerName] as string) || randomUUID();

    reply.header(headerName, requestId);

    const tenantHeaderName = config.tenant().headerName;
    const tenantId = normalizeHeader(req.headers[tenantHeaderName]);

    runWithRequestContext(
      {
        requestId,
        tenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
        method: req.method,
        path: stripQuery(req.url),
        startTimeMs: Date.now(),
      },
      () => done(),
    );
  };
}
