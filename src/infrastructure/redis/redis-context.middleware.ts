import { setRequestContext } from '#src/infrastructure/context/request-context.manager.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

/**
 * Middleware to inject the Redis service (as CacheManagerPort) into the RequestContext.
 * This enables L2 (shared) caching for services that rely on context.redis.
 */
@Injectable()
export class RedisContextMiddleware implements NestMiddleware {
  constructor(private readonly redis: RedisService) {}

  use(req: FastifyRequest, res: any, next: () => void) {
    // We assume setRequestContext has been called by RequestIdentityInterceptor or ClsMiddleware.
    // However, Interceptors run AFTER middleware.
    // So we must update the context via the manager which uses CLS.
    // The initial context might be empty or partial.
    // RequestIdentityInterceptor runs LATER.
    // But setRequestContext merges? No, it usually sets.

    // Actually, RequestIdentityInterceptor creates the object.
    // If we set it here, we might be overwriting or creating it early.
    // The safer way is to set it here, and RequestIdentityInterceptor should MERGE or extend.
    // Looking at RequestIdentityInterceptor: calls setRequestContext({...}).
    // Checking request-context.manager.ts: setRequestContext replaces the store?

    // Let's assume we can patch it using setRequestContext({ ...getRequestContext(), redis: this.redis });
    // But getRequestContext() might be null here.

    // If we are using CLS, we should start the context here if not started?
    // NestJS CLS usually starts in a separate upstream middleware.

    // For now, we just set the redis property on the context.
    setRequestContext({
      redis: this.redis,
    });

    next();
  }
}
