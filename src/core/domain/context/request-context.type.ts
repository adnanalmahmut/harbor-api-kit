import type { CacheManagerPort } from '#src/core/domain/ports/cache-manager.port.js';

import type {
  AuthenticatedSession,
  AuthenticatedUser,
} from '#src/core/domain/types/auth.types.js';

export type RequestContext = {
  requestId?: string;
  method?: string;
  path?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  sessionToken?: string;
  userAgent?: string;
  locale?: string;
  startTimeMs?: number;

  tenantId?: string;

  cache?: Map<string, unknown>;

  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;

  redis?: CacheManagerPort;
  user?: AuthenticatedUser;
  session?: AuthenticatedSession;
};
