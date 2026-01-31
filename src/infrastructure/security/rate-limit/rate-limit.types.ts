export type RateLimitRule = {
  points: number;
  durationSec: number;
};

export const RATE_LIMIT_META_KEY = 'rate_limit_rule';
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip';

// User-based rate limit
export const USER_RATE_LIMIT_META_KEY = 'user_rate_limit_rule';

// Session-based rate limit
export const SESSION_RATE_LIMIT_META_KEY = 'session_rate_limit_rule';
