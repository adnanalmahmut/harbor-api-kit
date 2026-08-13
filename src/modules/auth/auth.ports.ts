/**
 * What the auth module needs from the notification side. The configuration
 * ports that used to live here are gone: `AuthConfigPort` wrapped two values
 * that `authConfig` already exposes, and `SessionTrackerPort` tracked session
 * keys for bulk invalidation, which Better Auth now does itself in Redis.
 */

export type AuthEmailUser = {
  email: string;
  name?: string | null;
  locale?: string | null;
};

/**
 * Request-derived hints used to pick the email language. Passed explicitly by
 * the Better Auth callbacks rather than read from ambient request state, so the
 * sender has no hidden dependency on the request context.
 */
export type AuthEmailLocaleSource = {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

export type AuthEmailDelivery = {
  user: AuthEmailUser;
  /** Action link produced by the auth provider; used verbatim. */
  url: string;
  localeSource?: AuthEmailLocaleSource;
};

export type ChangeEmailConfirmationDelivery = AuthEmailDelivery & {
  /** The address being claimed — the confirmation is sent there, not to the current one. */
  newEmail: string;
};

export interface AuthEmailSenderPort {
  sendVerificationEmail(delivery: AuthEmailDelivery): Promise<void>;
  sendResetPasswordEmail(delivery: AuthEmailDelivery): Promise<void>;
  sendChangeEmailConfirmation(
    delivery: ChangeEmailConfirmationDelivery,
  ): Promise<void>;
}
