import {
  RATE_LIMIT_META_KEY,
  RATE_LIMIT_SKIP_KEY,
  type RateLimitRule,
} from '#src/infrastructure/security/rate-limit/rate-limit.types.js';
import { SetMetadata } from '@nestjs/common';

export const RateLimit = (rule: RateLimitRule) =>
  SetMetadata(RATE_LIMIT_META_KEY, rule);
export const RateLimitSkip = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true);
