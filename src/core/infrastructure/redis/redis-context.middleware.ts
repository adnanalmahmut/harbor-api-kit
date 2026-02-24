import { CORE_TOKENS } from '#src/core/core.tokens.js';
import type { RequestContextStorePort } from '#src/core/domain/index.js';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { RedisService } from './redis.service.js';

/**
 * Middleware to inject the Redis service (as CacheManagerPort) into the RequestContext.
 * This enables L2 (shared) caching for services that rely on context.redis.
 */
@Injectable()
export class RedisContextMiddleware implements NestMiddleware {
  constructor(
    private readonly redis: RedisService,
    @Inject(CORE_TOKENS.REQUEST_CONTEXT_STORE)
    private readonly contextStore: RequestContextStorePort,
  ) {}

  use(req: FastifyRequest, res: any, next: () => void) {
    this.contextStore.set({
      redis: this.redis,
    });

    next();
  }
}
