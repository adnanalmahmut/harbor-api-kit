export type RateLimitRule = {
  points: number;
  durationSec: number;
};

export const RATE_LIMIT_META_KEY = 'rate_limit_rule';
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip';
