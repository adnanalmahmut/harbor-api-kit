import { SecurityException } from '#src/core/exceptions/security.exception.js';
import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import {
  RATE_LIMIT_META_KEY,
  RATE_LIMIT_SKIP_KEY,
  type RateLimitRule,
} from '#src/infrastructure/security/rate-limit/rate-limit.types.js';
import { getRealIp } from '#src/infrastructure/security/rate-limit/rate-limit.util.js';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

function stripQuery(url: string) {
  const i = url.indexOf('?');
  return i >= 0 ? url.slice(0, i) : url;
}

function getRouteUrl(req: FastifyRequest): string {
  // Fastify route pattern - ثابت ولا يحتوي query
  const routePattern = (req as any).routeOptions?.url as string | undefined;
  if (routePattern) return routePattern;

  // fallback: raw url + strip query
  const raw = (req as any).raw?.url ?? req.url ?? '';
  return stripQuery(String(raw));
}

function parseRedisMultiValue<T = unknown>(entry: unknown): T | undefined {
  // ioredis multi exec returns: Array<[Error | null, any]>
  if (!Array.isArray(entry) || entry.length < 2) return undefined;
  return entry[1] as T;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly cfg: AppConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const rl = this.cfg.rateLimit();
    if (!rl.enabled) return true;

    const handler = ctx.getHandler();
    const cls = ctx.getClass();

    const skip =
      this.reflector.get<boolean>(RATE_LIMIT_SKIP_KEY, handler) ??
      this.reflector.get<boolean>(RATE_LIMIT_SKIP_KEY, cls) ??
      false;

    if (skip) return true;

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

    const clientKey = `ip:${getRealIp(req)}`;

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
    tx.zrange(fullKey, 0, 0, 'WITHSCORES'); // oldest
    tx.pexpire(fullKey, windowMs + 5000); // TTL احتياطي

    const results = await tx.exec();

    const count = Number(parseRedisMultiValue(results?.[2]) ?? 0);

    const oldestWithScores = parseRedisMultiValue<unknown[]>(results?.[3]);
    // oldestWithScores: [member, score] أو []
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

    return true;
  }
}
