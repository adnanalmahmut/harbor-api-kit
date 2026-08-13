import { httpConfig } from '#src/config/index.js';
import { SecurityException } from '#src/common/app-exception.js';
import { RateLimiterPort } from './rate-limit.port.js';
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
  USER_RATE_LIMIT_META_KEY,
  type RateLimitRule,
} from './rate-limit.decorator.js';

/**
 * User-based rate limiting interceptor.
 * Must run AFTER AuthGuard since it requires req.user.id
 *
 * @example
 * @UseGuards(AuthGuard)
 * @UserRateLimit({ points: 10, durationSec: 3600 })
 * @Post('messages')
 * sendMessage() {}
 */
@Injectable()
export class UserRateLimitInterceptor implements NestInterceptor {
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
    const rule = this.reflector.get<RateLimitRule>(
      USER_RATE_LIMIT_META_KEY,
      ctx.getHandler(),
    );

    if (!rule) return next.handle();

    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const reply = ctx.switchToHttp().getResponse<FastifyReply>();

    if (!req.user?.id) return next.handle();

    const rl = this.config.rateLimit;
    const userId = req.user.id;
    const routeUrl = this.getRouteUrl(req);
    const routeId = `${req.method}:${routeUrl}`;

    const { remaining, resetAtMs, blocked } = await this.rateLimiter.consume({
      bucketKey: `rl:user:${userId}:${routeId}`,
      points: rule.points,
      durationMs: rule.durationSec * 1000,
    });

    reply.header(`${rl.headerPrefix}-User-Limit`, String(rule.points));
    reply.header(`${rl.headerPrefix}-User-Remaining`, String(remaining));
    reply.header(
      `${rl.headerPrefix}-User-Reset`,
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
