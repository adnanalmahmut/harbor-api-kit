import type { CacheManagerPort } from '#src/core/domain/ports/cache-manager.port.js';
import type { RequestContextStorePort } from '#src/core/domain/ports/request-context.store.port.js';
import {
  normalizeHeader,
  stripQuery,
} from '#src/core/domain/utils/shared.utils.js';
import type { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';

export function createRequestContextHook(
  config: AppConfigService,
  contextStore: RequestContextStorePort,
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
