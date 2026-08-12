import type { RequestContext } from '#src/core/index.js';

export type AuthEmailUser = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  locale?: string | null;
};

export type ChangeEmailVerificationParams = {
  user: AuthEmailUser;
  token: string;
  newEmail: string;
};

export interface AuthEmailSenderPort {
  sendChangeEmailVerification(
    params: ChangeEmailVerificationParams,
    context: RequestContext,
  ): Promise<void>;
}

export abstract class AuthConfigPort {
  abstract get sessionTokenCookie(): string;
  abstract get sessionLookupCacheTtlSec(): number;
}

export abstract class SessionTrackerPort {
  abstract trackSession(userId: string, cacheKey: string): Promise<void>;
  abstract invalidateUserSessions(userId: string): Promise<void>;
}
