// Actually, let's use a domain-agnostic SessionContext structure or define a Session entity.
// User dump showed session model in schema.
// Let's assume we want a simple interface for now.

import type { Session, User } from './auth-dtos.js';

export interface SessionContext {
  userId: string;
  sessionId: string;
  tenantId?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: User;
  session?: Session;
}

export interface CurrentSessionProviderPort {
  get(): Promise<SessionContext | null>;
}
