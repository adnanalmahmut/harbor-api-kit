// better-auth-code-map.ts
import { AuthException } from '#src/modules/auth/application/exceptions/auth.exception.js';

export const BETTER_AUTH_CODE_MAP: Record<string, () => AuthException> = {
  INVALID_EMAIL_OR_PASSWORD: () => AuthException.invalidCredentials(),
  EMAIL_NOT_VERIFIED: () => AuthException.emailNotVerified(),
  TOO_MANY_REQUESTS: () => AuthException.tooManyRequests(),
  USER_ALREADY_EXISTS: () => AuthException.emailAlreadyExists(),
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: () =>
    AuthException.emailAlreadyExists(),
  INVALID_REQUEST: () => AuthException.invalidRequest(),
  INVALID_EMAIL: () => AuthException.invalidEmail(),
  INVALID_PASSWORD: () => AuthException.passwordIncorrect(),
  SESSION_EXPIRED: () => AuthException.sessionExpired(),
  INVALID_TOKEN: () => AuthException.invalidToken(),
};
