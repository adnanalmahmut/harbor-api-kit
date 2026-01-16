import { SetMetadata } from '@nestjs/common';
import {
  RATE_LIMIT_META_KEY,
  RATE_LIMIT_SKIP_KEY,
  type RateLimitRule,
} from './rate-limit.types.js';

export const RateLimit = (rule: RateLimitRule) =>
  SetMetadata(RATE_LIMIT_META_KEY, rule);
export const RateLimitSkip = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true);
