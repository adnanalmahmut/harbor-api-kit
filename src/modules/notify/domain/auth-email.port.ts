/**
 * The transactional emails the authentication flow triggers. Naming the kind
 * instead of a template keeps the template file, the subject translation key
 * and the retry policy owned by this module: callers only say what happened.
 */
export type AuthEmailKind = 'verify-email' | 'reset-password' | 'change-email';

export interface SendAuthEmailParams {
  kind: AuthEmailKind;
  /** Recipient. For `change-email` this is the NEW address being confirmed. */
  to: string;
  /** Display name used in the greeting; empty string is acceptable. */
  name: string;
  /** Action link, taken verbatim from the auth provider. */
  url: string;
  locale?: string;
}

export abstract class AuthEmailPort {
  abstract sendAuthEmail(params: SendAuthEmailParams): Promise<void>;
}
