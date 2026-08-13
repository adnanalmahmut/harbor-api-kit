import type { httpConfig, tenantConfig } from '#src/config/index.js';
import type { RequestContextStorePort } from '#src/common/context/request-context.store.js';
import type { CacheManagerPort } from '#src/infrastructure/cache/cache-manager.port.js';
import { normalizeHeader, stripQuery } from '#src/common/utils/shared.utils.js';
import type { ConfigType } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';

export function createRequestContextHook(
  http: ConfigType<typeof httpConfig>,
  tenant: ConfigType<typeof tenantConfig>,
  contextStore: RequestContextStorePort,
  redisService?: CacheManagerPort,
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
