import type { RequestContext } from '#src/core/context/request-context.type.js';

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
