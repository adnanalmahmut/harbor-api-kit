import { SecurityException, stripQuery } from '#src/core/domain/index.js';
import {
  AppConfigService,
  RedisService,
} from '#src/core/infrastructure/index.js';
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
import {
  RATE_LIMIT_META_KEY,
  RATE_LIMIT_SKIP_KEY,
  type RateLimitRule,
} from './rate-limit.types.js';
import { getRealIp } from './rate-limit.util.js';

function getRouteUrl(req: FastifyRequest): string {
  const routePattern = (req as any).routeOptions?.url as string | undefined;
  if (routePattern) return routePattern;

  const raw =
    ((req as any).raw?.url as string | undefined) ??
    (req.url as string | undefined);

  return stripQuery(raw);
}

function parseRedisMultiValue<T = unknown>(entry: unknown): T | undefined {
  if (!Array.isArray(entry) || entry.length < 2) return undefined;
  return entry[1] as T;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly cfg: AppConfigService,
  ) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const rl = this.cfg.rateLimit();
    if (!rl.enabled) return next.handle();

    const handler = ctx.getHandler();
    const cls = ctx.getClass();

    const skip =
      this.reflector.get<boolean>(RATE_LIMIT_SKIP_KEY, handler) ??
      this.reflector.get<boolean>(RATE_LIMIT_SKIP_KEY, cls) ??
      false;

    if (skip) return next.handle();

    const rule: RateLimitRule = this.reflector.get<RateLimitRule>(
      RATE_LIMIT_META_KEY,
      handler,
    ) ??
      this.reflector.get<RateLimitRule>(RATE_LIMIT_META_KEY, cls) ?? {
        points: rl.points,
        durationSec: rl.durationSec,
      };

    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const reply = ctx.switchToHttp().getResponse<FastifyReply>();

    const routeUrl = getRouteUrl(req);
    const routeId = `${req.method}:${routeUrl}`;

    const clientKey = this.buildClientKey(req);

    const now = Date.now();
    const windowMs = rule.durationSec * 1000;

    const zkey = `rl:${routeId}:${clientKey}`;
    const fullKey = this.redis.key(zkey);

    const raw = this.redis.raw();
    const member = `${now}:${crypto.randomBytes(8).toString('hex')}`;
    const cutoff = now - windowMs;

    const tx = raw.multi();
    tx.zremrangebyscore(fullKey, 0, cutoff);
    tx.zadd(fullKey, now, member);
    tx.zcard(fullKey);
    tx.zrange(fullKey, 0, 0, 'WITHSCORES');
    tx.pexpire(fullKey, windowMs + 5000);

    const results = await tx.exec();

    const count = Number(parseRedisMultiValue(results?.[2]) ?? 0);

    const oldestWithScores = parseRedisMultiValue<unknown[]>(results?.[3]);
    const oldestScore =
      Array.isArray(oldestWithScores) && oldestWithScores.length >= 2
        ? Number(oldestWithScores[1])
        : now;

    const resetMs = oldestScore + windowMs;
    const remaining = Math.max(0, rule.points - count);

    reply.header(`${rl.headerPrefix}-Limit`, String(rule.points));
    reply.header(`${rl.headerPrefix}-Remaining`, String(remaining));
    reply.header(`${rl.headerPrefix}-Reset`, String(Math.ceil(resetMs / 1000)));

    if (count > rule.points) {
      throw SecurityException.rateLimitExceeded();
    }

    return next.handle();
  }

  private buildClientKey(req: FastifyRequest): string {
    const anyReq = req as any;
    if (anyReq.user?.id) return `user:${anyReq.user.id}`;
    if (anyReq.session?.id) return `session:${anyReq.session.id}`;
    return `ip:${getRealIp(req)}`;
  }
}
