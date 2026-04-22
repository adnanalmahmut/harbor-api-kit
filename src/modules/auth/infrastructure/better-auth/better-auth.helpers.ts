import type { RequestContext } from '#src/core/index.js';
import { AuthException } from '../../application/index.js';
import type { CookieDirective } from '../../domain/index.js';
import type { PinoLogger } from 'nestjs-pino';
import { mapBetterAuthError } from './better-auth-errors.js';

/** Minimal shape of a Fastify request for the BetterAuth node handler bridge. */
export interface FastifyLikeRequest {
  raw: import('http').IncomingMessage;
  ip: string;
  cookies?: Record<string, string>;
}

/** Minimal shape of a Fastify reply for the BetterAuth node handler bridge. */
export interface FastifyLikeReply {
  raw: import('http').ServerResponse;
}

/** Typed shape for errors thrown by BetterAuth API calls in catch blocks. */
export interface BetterAuthErrorLike {
  status?: number;
  statusCode?: number;
  body?: { statusCode?: number };
  url?: string;
  response?: { url?: string };
  headers?: Headers;
}

export function toHeadersFromContext(
  ctx: RequestContext,
): Record<string, string> {
  const h: Record<string, string> = {};
  const headers = ctx.headers ?? {};
  const prohibited = ['content-length', 'content-type', 'host', 'connection'];

  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    if (prohibited.includes(k.toLowerCase())) continue;

    if (Array.isArray(v)) h[k] = v.join(',');
    else h[k] = String(v);
  }
  if (ctx.ip && !h['x-forwarded-for']) {
    h['x-forwarded-for'] = ctx.ip;
  }
  if (ctx.userAgent && !h['user-agent']) {
    h['user-agent'] = ctx.userAgent;
  }

  return h;
}

function parseAttributes(parts: string[]): CookieDirective['options'] {
  const options: {
    path?: string;
    domain?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    expires?: Date;
  } = {};
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

export function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function safeErrorFields(e: unknown): {
  status?: number;
  code?: string;
} {
  const err = e as {
    status?: number;
    statusCode?: number;
    code?: string;
    body?: { code?: string };
  };
  return {
    status: err?.status ?? err?.statusCode,
    code: err?.code ?? err?.body?.code,
  };
}

/** Safe JSON parse helper (for roles/permissions stored as JSON string). */
export function safeJsonParse<T>(v: unknown, fallback: T): T {
  if (typeof v !== 'string') return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function rethrowAsAppException(e: unknown, logger: PinoLogger): never {
  logger.error(safeErrorFields(e), 'BetterAuth Internal Error');
  if (e instanceof AuthException) throw e;
  mapBetterAuthError(e);
}
