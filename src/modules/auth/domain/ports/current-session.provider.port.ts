import type {
  Session,
  User,
} from '#src/modules/auth/domain/ports/auth-dtos.js';

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
