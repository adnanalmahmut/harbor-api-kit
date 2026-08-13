import type { FastifyReply } from 'fastify';

/**
 * Cookie translation between Better Auth and Fastify, both directions.
 *
 * Better Auth answers with a Fetch `Headers` object; Fastify writes a
 * `set-cookie` reply header. Reading and writing were two files with one
 * caller between them — the guard, which forwards refreshed session cookies.
 */

export interface CookieDirective {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    expires?: Date;
  };
}

function parseAttributes(parts: string[]): CookieDirective['options'] {
  const options: NonNullable<CookieDirective['options']> = {};
  for (const part of parts) {
    const p = part.trim().toLowerCase();
    if (p.startsWith('path=')) options.path = part.trim().substring(5);
    else if (p.startsWith('domain=')) options.domain = part.trim().substring(7);
    else if (p === 'httponly') options.httpOnly = true;
    else if (p === 'secure') options.secure = true;
    else if (p.startsWith('samesite='))
      options.sameSite = part.trim().substring(9).toLowerCase() as
        | 'strict'
        | 'lax'
        | 'none';
    else if (p.startsWith('max-age='))
      options.maxAge = parseInt(part.trim().substring(8));
    else if (p.startsWith('expires=')) {
      const expires = new Date(part.trim().substring(8));
      if (!Number.isNaN(expires.valueOf())) {
        options.expires = expires;
      }
    }
  }
  return options;
}

/**
 * Reads the Set-Cookie directives Better Auth produced for a session refresh so
 * the guard can forward them on the Fastify reply.
 */
export function readCookiesFromHeaders(headers: Headers): CookieDirective[] {
  if (!headers) return [];
  const directives: CookieDirective[] = [];
  // Headers.getSetCookie() is not in all TS lib typings
  const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
  let cookies: string[] = [];

  if (typeof anyHeaders.getSetCookie === 'function') {
    cookies = anyHeaders.getSetCookie();
  } else {
    const raw = headers.get('set-cookie');
    if (raw) {
      cookies = raw.split(/,(?=[^;]+?=)/g);
    }
  }

  for (const cookieStr of cookies) {
    const parts = cookieStr.split(';');
    const firstPart = parts[0];
    const eqIdx = firstPart.indexOf('=');
    if (eqIdx > 0) {
      const name = firstPart.substring(0, eqIdx).trim();
      const value = firstPart.substring(eqIdx + 1).trim();
      const options = parseAttributes(parts.slice(1));
      directives.push({ name, value, options });
    }
  }
  return directives;
}

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
