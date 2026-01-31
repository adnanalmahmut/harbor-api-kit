import {
  RATE_LIMIT_META_KEY,
  RATE_LIMIT_SKIP_KEY,
  SESSION_RATE_LIMIT_META_KEY,
  USER_RATE_LIMIT_META_KEY,
  type RateLimitRule,
} from '#src/infrastructure/security/rate-limit/rate-limit.types.js';
import { SetMetadata } from '@nestjs/common';

/**
 * IP-based rate limit (works before auth)
 * @example @RateLimit({ points: 100, durationSec: 60 })
 */
export const RateLimit = (rule: RateLimitRule) =>
  SetMetadata(RATE_LIMIT_META_KEY, rule);

/**
 * Skip rate limiting for this endpoint
 */
export const RateLimitSkip = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true);

/**
 * User-based rate limit (requires auth)
 * Uses req.user.id as the rate limit key
 * @example @UserRateLimit({ points: 10, durationSec: 3600 })
 */
export const UserRateLimit = (rule: RateLimitRule) =>
  SetMetadata(USER_RATE_LIMIT_META_KEY, rule);

/**
 * Session-based rate limit (requires auth)
 * Uses req.session.id as the rate limit key
 * @example @SessionRateLimit({ points: 5, durationSec: 60 })
 */
export const SessionRateLimit = (rule: RateLimitRule) =>
  SetMetadata(SESSION_RATE_LIMIT_META_KEY, rule);
