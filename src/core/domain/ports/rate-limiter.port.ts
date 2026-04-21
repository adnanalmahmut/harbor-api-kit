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

export interface RateLimiterPort {
  consume(params: RateLimiterConsumeParams): Promise<RateLimiterConsumeResult>;
}
