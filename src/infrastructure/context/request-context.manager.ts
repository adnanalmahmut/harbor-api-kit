import type { RequestContext } from '#src/core/context/request-context.type.js';
import type { CacheManagerPort } from '#src/core/ports/cache-manager.port.js';
import type { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { normalizeHeader } from '#src/infrastructure/i18n/i18n-helpers.js';
import { stripQuery } from '#src/infrastructure/validation/http.utils.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

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

import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';

export function requireTenantId(): string {
  const t = getTenantId();
  if (!t)
    throw new AppException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'core.errors.common.validation',
      details: { reason: 'Missing tenantId in context' },
    });
  return t;
}

export function runWithRequestContext<T>(
  initial: RequestContext,
  fn: () => T,
): T {
  return requestContext.run(initial, fn);
}

export type CacheScope = 'request' | 'redis' | 'both';

// getOrLoad migrated to AppCacheService (SharedModule)

// Update hook creator to accept RedisService
export function createRequestContextHook(
  config: AppConfigService,
  redisService?: CacheManagerPort,
) {
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
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: stripQuery(req.url),
        startTimeMs: Date.now(),
        cache: new Map(),
        redis: redisService, // Inject redis service
      },
      () => done(),
    );
  };
}
