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
