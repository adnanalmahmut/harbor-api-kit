import { SecurityException } from '#src/core/exceptions/security.exception.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import {
  SESSION_RATE_LIMIT_META_KEY,
  type RateLimitRule,
} from '#src/infrastructure/security/rate-limit/rate-limit.types.js';
import { AppConfigService } from '#src/shared/config/app-config.service.js';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import type { Observable } from 'rxjs';

/**
 * Session-based rate limiting interceptor.
 * Must run AFTER AuthGuard since it requires req.session.id
 *
 * @example
 * @UseGuards(AuthGuard)
 * @SessionRateLimit({ points: 5, durationSec: 60 })
 * @Post('actions')
 * performAction() {}
 */
@Injectable()
export class SessionRateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly cfg: AppConfigService,
  ) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const rule = this.reflector.get<RateLimitRule>(
      SESSION_RATE_LIMIT_META_KEY,
      ctx.getHandler(),
    );

    // No rule defined, skip
    if (!rule) return next.handle();

    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const reply = ctx.switchToHttp().getResponse<FastifyReply>();

    // Session not available, skip session-based limiting
    if (!req.session?.id) return next.handle();

    const rl = this.cfg.rateLimit();
    const sessionId = req.session.id;
    const routeUrl = this.getRouteUrl(req);
    const routeId = `${req.method}:${routeUrl}`;

    const zkey = `rl:session:${sessionId}:${routeId}`;
    const fullKey = this.redis.key(zkey);

    const now = Date.now();
    const windowMs = rule.durationSec * 1000;
    const member = `${now}:${crypto.randomBytes(8).toString('hex')}`;
    const cutoff = now - windowMs;

    const raw = this.redis.raw();
    const tx = raw.multi();
    tx.zremrangebyscore(fullKey, 0, cutoff);
    tx.zadd(fullKey, now, member);
    tx.zcard(fullKey);
    tx.zrange(fullKey, 0, 0, 'WITHSCORES');
    tx.pexpire(fullKey, windowMs + 5000);

    const results = await tx.exec();

    const count = Number(this.parseResult(results?.[2]) ?? 0);
    const oldestWithScores = this.parseResult<unknown[]>(results?.[3]);
    const oldestScore =
      Array.isArray(oldestWithScores) && oldestWithScores.length >= 2
        ? Number(oldestWithScores[1])
        : now;

    const resetMs = oldestScore + windowMs;
    const remaining = Math.max(0, rule.points - count);

    reply.header(`${rl.headerPrefix}-Session-Limit`, String(rule.points));
    reply.header(`${rl.headerPrefix}-Session-Remaining`, String(remaining));
    reply.header(
      `${rl.headerPrefix}-Session-Reset`,
      String(Math.ceil(resetMs / 1000)),
    );

    if (count > rule.points) {
      throw SecurityException.rateLimitExceeded();
    }

    return next.handle();
  }

  private getRouteUrl(req: FastifyRequest): string {
    const routePattern = (req as any).routeOptions?.url as string | undefined;
    if (routePattern) return routePattern;
    const raw = (req as any).raw?.url ?? req.url ?? '';
    const i = raw.indexOf('?');
    return i >= 0 ? raw.slice(0, i) : raw;
  }

  private parseResult<T = unknown>(entry: unknown): T | undefined {
    if (!Array.isArray(entry) || entry.length < 2) return undefined;
    return entry[1] as T;
  }
}
