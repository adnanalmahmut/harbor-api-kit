import { SetMetadata } from '@nestjs/common';

export type RateLimitRule = {
  points: number;
  durationSec: number;
};

export const RATE_LIMIT_META_KEY = 'rate_limit_rule';
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip';
export const USER_RATE_LIMIT_META_KEY = 'user_rate_limit_rule';
export const SESSION_RATE_LIMIT_META_KEY = 'session_rate_limit_rule';

/**
 * Overrides the global per-route budget. Keyed by user, then session, then IP —
 * so it works before authentication.
 *
 * @example @RateLimit({ points: 100, durationSec: 60 })
 */
export const RateLimit = (rule: RateLimitRule) =>
  SetMetadata(RATE_LIMIT_META_KEY, rule);

/** Exempts the route from the global budget entirely. */
export const RateLimitSkip = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true);

/**
 * An additional budget keyed by `req.user.id`. Requires AuthGuard to have run,
 * and is skipped for anonymous requests.
 *
 * @example @UserRateLimit({ points: 10, durationSec: 3600 })
 */
export const UserRateLimit = (rule: RateLimitRule) =>
  SetMetadata(USER_RATE_LIMIT_META_KEY, rule);

/**
 * An additional budget keyed by `req.session.id`. Requires AuthGuard to have
 * run, and is skipped for anonymous requests.
 *
 * @example @SessionRateLimit({ points: 5, durationSec: 60 })
 */
export const SessionRateLimit = (rule: RateLimitRule) =>
  SetMetadata(SESSION_RATE_LIMIT_META_KEY, rule);
