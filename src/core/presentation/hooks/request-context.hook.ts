import {
  normalizeHeader,
  stripQuery,
  type CacheManagerPort,
  type RequestContextStorePort,
} from '#src/core/domain/index.js';
import { AppConfigService } from '#src/core/infrastructure/index.js';
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
