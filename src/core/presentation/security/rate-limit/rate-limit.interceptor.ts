import { CORE_TOKENS } from '#src/core/core.tokens.js';
import {
  SecurityException,
  stripQuery,
  type RateLimiterPort,
} from '#src/core/domain/index.js';
import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
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

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CORE_TOKENS.RATE_LIMITER)
    private readonly rateLimiter: RateLimiterPort,
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

    const { remaining, resetAtMs, blocked } = await this.rateLimiter.consume({
      bucketKey: `rl:${routeId}:${clientKey}`,
      points: rule.points,
      durationMs: rule.durationSec * 1000,
    });

    reply.header(`${rl.headerPrefix}-Limit`, String(rule.points));
    reply.header(`${rl.headerPrefix}-Remaining`, String(remaining));
    reply.header(
      `${rl.headerPrefix}-Reset`,
      String(Math.ceil(resetAtMs / 1000)),
    );

    if (blocked) {
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
