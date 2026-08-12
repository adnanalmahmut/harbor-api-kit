import type { CookieDirective } from '../../domain/index.js';
import type { FastifyReply } from 'fastify';

function serializeCookie(cookie: CookieDirective): string {
  let value = `${cookie.name}=${cookie.value}`;
  const options = cookie.options;
  if (!options) return value;
  if (options.maxAge !== undefined) {
    value += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  if (options.domain) value += `; Domain=${options.domain}`;
  if (options.path) value += `; Path=${options.path}`;
  if (options.expires) value += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) value += '; HttpOnly';
  if (options.secure) value += '; Secure';
  if (options.sameSite) value += `; SameSite=${options.sameSite}`;
  return value;
}

export function applyCookies(
  reply: FastifyReply,
  cookies?: CookieDirective[],
): void {
  if (!cookies || cookies.length === 0) return;
  const existing = reply.getHeader('set-cookie');
  const current = Array.isArray(existing)
    ? existing.map(String)
    : existing
      ? [String(existing)]
      : [];
  reply.header('set-cookie', [
    ...current,
    ...cookies.map((cookie) => serializeCookie(cookie)),
  ]);
}
