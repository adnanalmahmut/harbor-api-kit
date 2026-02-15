import type { CookieDirective } from '#src/modules/auth/domain/ports/cookie-directive.js';

export type AuthResult<T> = {
  data: T;
  cookies?: CookieDirective[];
};
