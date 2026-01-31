import type { CookieDirective } from '#src/modules/auth/application/common/cookie-directive.js';

export type AuthResult<T> = {
  data: T;
  cookies?: CookieDirective[];
};
