import { CORE_TOKENS } from '#src/core/core.tokens.js';
import {
  SecurityException,
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
  SESSION_RATE_LIMIT_META_KEY,
  type RateLimitRule,
} from './rate-limit.types.js';

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
    @Inject(CORE_TOKENS.RATE_LIMITER)
    private readonly rateLimiter: RateLimiterPort,
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

    if (!rule) return next.handle();

    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const reply = ctx.switchToHttp().getResponse<FastifyReply>();

    if (!req.session?.id) return next.handle();

    const rl = this.cfg.rateLimit();
    const sessionId = req.session.id;
    const routeUrl = this.getRouteUrl(req);
    const routeId = `${req.method}:${routeUrl}`;

    const { remaining, resetAtMs, blocked } = await this.rateLimiter.consume({
      bucketKey: `rl:session:${sessionId}:${routeId}`,
      points: rule.points,
      durationMs: rule.durationSec * 1000,
    });

    reply.header(`${rl.headerPrefix}-Session-Limit`, String(rule.points));
    reply.header(`${rl.headerPrefix}-Session-Remaining`, String(remaining));
    reply.header(
      `${rl.headerPrefix}-Session-Reset`,
      String(Math.ceil(resetAtMs / 1000)),
    );

    if (blocked) {
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
}
