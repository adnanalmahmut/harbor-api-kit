import { SecurityException } from '#src/common/app-exception.js';
import { stripQuery } from '#src/common/utils.js';
import { httpConfig } from '#src/config/index.js';
import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import {
  RATE_LIMIT_META_KEY,
  RATE_LIMIT_SKIP_KEY,
  SESSION_RATE_LIMIT_META_KEY,
  USER_RATE_LIMIT_META_KEY,
  type RateLimitRule,
} from './rate-limit.decorator.js';
import { RateLimiterPort } from './rate-limit.port.js';

/**
 * Real client IP, preferring the proxy headers over Fastify's own detection.
 * X-Forwarded-For is `client, proxy1, proxy2` — the first entry is the client.
 */
export function getRealIp(req: FastifyRequest): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const first = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0];
    const ip = first?.trim();
    if (ip) return ip;
  }

  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    if (ip) return ip.trim();
  }

  return req.ip || 'unknown';
}

/**
 * The route pattern (`/files/:id`) rather than the resolved path, so one
 * abusive client cannot spread its budget across generated ids.
 */
function getRouteId(req: FastifyRequest): string {
  const routePattern = (req as any).routeOptions?.url as string | undefined;
  const url =
    routePattern ??
    stripQuery(
      ((req as any).raw?.url as string | undefined) ??
        (req.url as string | undefined),
    );

  return `${req.method}:${url}`;
}

/**
 * One interceptor for all three scopes.
 *
 * These were three separate `APP_INTERCEPTOR`s — global, per-user and
 * per-session — each re-deriving the route id, re-reading the config and
 * repeating the same consume-then-write-headers sequence. They now share that
 * body and differ only in the table below.
 *
 * Order matters and is preserved: the global budget is consumed first, so a
 * request already over it never touches the per-user or per-session buckets.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RateLimiterPort)
    private readonly rateLimiter: RateLimiterPort,
    @Inject(httpConfig.KEY)
    private readonly config: ConfigType<typeof httpConfig>,
  ) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const reply = ctx.switchToHttp().getResponse<FastifyReply>();
    const routeId = getRouteId(req);

    await this.consumeGlobal(ctx, req, reply, routeId);

    const userId = (req as any).user?.id as string | undefined;
    if (userId) {
      await this.consumeScoped(ctx, reply, {
        metaKey: USER_RATE_LIMIT_META_KEY,
        bucketKey: `rl:user:${userId}:${routeId}`,
        headerInfix: 'User-',
      });
    }

    const sessionId = (req as any).session?.id as string | undefined;
    if (sessionId) {
      await this.consumeScoped(ctx, reply, {
        metaKey: SESSION_RATE_LIMIT_META_KEY,
        bucketKey: `rl:session:${sessionId}:${routeId}`,
        headerInfix: 'Session-',
      });
    }

    return next.handle();
  }

  /** The always-on budget, unless the route opts out or the feature is off. */
  private async consumeGlobal(
    ctx: ExecutionContext,
    req: FastifyRequest,
    reply: FastifyReply,
    routeId: string,
  ): Promise<void> {
    const rl = this.config.rateLimit;
    if (!rl.enabled) return;

    const handler = ctx.getHandler();
    const cls = ctx.getClass();

    const skip =
      this.reflector.get<boolean>(RATE_LIMIT_SKIP_KEY, handler) ??
      this.reflector.get<boolean>(RATE_LIMIT_SKIP_KEY, cls) ??
      false;

    if (skip) return;

    const rule: RateLimitRule = this.reflector.get<RateLimitRule>(
      RATE_LIMIT_META_KEY,
      handler,
    ) ??
      this.reflector.get<RateLimitRule>(RATE_LIMIT_META_KEY, cls) ?? {
        points: rl.points,
        durationSec: rl.durationSec,
      };

    await this.consume(reply, {
      rule,
      bucketKey: `rl:${routeId}:${this.buildClientKey(req)}`,
      headerInfix: '',
    });
  }

  /** An opt-in budget, declared per handler by @UserRateLimit / @SessionRateLimit. */
  private async consumeScoped(
    ctx: ExecutionContext,
    reply: FastifyReply,
    opts: { metaKey: string; bucketKey: string; headerInfix: string },
  ): Promise<void> {
    const rule = this.reflector.get<RateLimitRule>(
      opts.metaKey,
      ctx.getHandler(),
    );
    if (!rule) return;

    await this.consume(reply, {
      rule,
      bucketKey: opts.bucketKey,
      headerInfix: opts.headerInfix,
    });
  }

  private async consume(
    reply: FastifyReply,
    opts: { rule: RateLimitRule; bucketKey: string; headerInfix: string },
  ): Promise<void> {
    const prefix = `${this.config.rateLimit.headerPrefix}-${opts.headerInfix}`;

    const { remaining, resetAtMs, blocked } = await this.rateLimiter.consume({
      bucketKey: opts.bucketKey,
      points: opts.rule.points,
      durationMs: opts.rule.durationSec * 1000,
    });

    reply.header(`${prefix}Limit`, String(opts.rule.points));
    reply.header(`${prefix}Remaining`, String(remaining));
    reply.header(`${prefix}Reset`, String(Math.ceil(resetAtMs / 1000)));

    if (blocked) {
      throw SecurityException.rateLimitExceeded();
    }
  }

  private buildClientKey(req: FastifyRequest): string {
    const anyReq = req as any;
    if (anyReq.user?.id) return `user:${anyReq.user.id}`;
    if (anyReq.session?.id) return `session:${anyReq.session.id}`;
    return `ip:${getRealIp(req)}`;
  }
}
