import type { CookieDirective } from '#src/modules/auth/application/common/cookie-directive.js';
import type { FastifyReply } from 'fastify';

export function serializeCookie(c: CookieDirective): string {
  let str = `${c.name}=${c.value}`;

  if (c.options) {
    if (c.options.maxAge !== undefined)
      str += `; Max-Age=${Math.floor(c.options.maxAge)}`;
    if (c.options.domain) str += `; Domain=${c.options.domain}`;
    if (c.options.path) str += `; Path=${c.options.path}`;
    if (c.options.expires)
      str += `; Expires=${c.options.expires.toUTCString()}`;
    if (c.options.httpOnly) str += '; HttpOnly';
    if (c.options.secure) str += '; Secure';
    if (c.options.sameSite) {
      const ss = c.options.sameSite.toLowerCase();
      str += `; SameSite=${ss.charAt(0).toUpperCase() + ss.slice(1)}`;
    }
  }

  return str;
}

export function applyCookies(reply: FastifyReply, cookies?: CookieDirective[]) {
  if (!cookies || cookies.length === 0) return;

  const serialized = cookies.map(serializeCookie);
  reply.header('set-cookie', serialized);
}
