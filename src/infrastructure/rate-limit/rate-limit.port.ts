import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { RedisService } from '../cache/redis.service.js';

export interface RateLimiterConsumeParams {
  bucketKey: string;
  points: number;
  durationMs: number;
}

export interface RateLimiterConsumeResult {
  count: number;
  remaining: number;
  resetAtMs: number;
  blocked: boolean;
}

/**
 * Abstract class rather than an interface so it doubles as the DI token.
 */
export abstract class RateLimiterPort {
  abstract consume(
    params: RateLimiterConsumeParams,
  ): Promise<RateLimiterConsumeResult>;
}

/**
 * A sliding window kept as a Redis sorted set: one member per request scored by
 * timestamp, trimmed to the window on every consume. More accurate than a fixed
 * counter at the window boundary, which is where burst abuse lands.
 */
@Injectable()
export class RedisRateLimiterAdapter implements RateLimiterPort {
  constructor(private readonly redis: RedisService) {}

  async consume({
    bucketKey,
    points,
    durationMs,
  }: RateLimiterConsumeParams): Promise<RateLimiterConsumeResult> {
    const fullKey = this.redis.key(bucketKey);
    const raw = this.redis.raw();
    const now = Date.now();
    const member = `${now}:${crypto.randomBytes(8).toString('hex')}`;
    const cutoff = now - durationMs;

    const tx = raw.multi();
    tx.zremrangebyscore(fullKey, 0, cutoff);
    tx.zadd(fullKey, now, member);
    tx.zcard(fullKey);
    tx.zrange(fullKey, 0, 0, 'WITHSCORES');
    tx.pexpire(fullKey, durationMs + 5000);

    const results = await tx.exec();

    const count = Number(this.parseResult(results?.[2]) ?? 0);
    const oldestWithScores = this.parseResult<unknown[]>(results?.[3]);
    const oldestScore =
      Array.isArray(oldestWithScores) && oldestWithScores.length >= 2
        ? Number(oldestWithScores[1])
        : now;

    const resetAtMs = oldestScore + durationMs;
    const remaining = Math.max(0, points - count);

    return { count, remaining, resetAtMs, blocked: count > points };
  }

  private parseResult<T = unknown>(entry: unknown): T | undefined {
    if (!Array.isArray(entry) || entry.length < 2) return undefined;
    return entry[1] as T;
  }
}
