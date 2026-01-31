import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import type { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { CSRF_METHODS } from '#src/infrastructure/security/csrf/csrf.constants.js';
import {
  isAllowedByOriginOrReferer,
  makeCsrfToken,
} from '#src/infrastructure/security/csrf/csrf.util.js';
import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly cfg: AppConfigService) {}

  private hasAuthCookie(req: FastifyRequest): boolean {
    const { sessionTokenCookie, sessionDataCookie } = this.cfg.auth();
    const cookies = (req as any).cookies as Record<string, string> | undefined;
    const cookieHeader = String(req.headers?.cookie ?? '');

    return (
      Boolean(cookies?.[sessionTokenCookie]) ||
      Boolean(cookies?.[sessionDataCookie]) ||
      cookieHeader.includes(`${sessionTokenCookie}=`) ||
      cookieHeader.includes(`${sessionDataCookie}=`)
    );
  }

  // "Browser-like" heuristic: headers browsers usually send.
  // We intentionally do NOT treat Postman as browser unless it explicitly sets these.
  private isBrowserLike(req: FastifyRequest): boolean {
    const h = req.headers ?? {};
    return (
      typeof h['sec-fetch-site'] === 'string' ||
      typeof h['sec-fetch-mode'] === 'string' ||
      typeof h['origin'] === 'string' ||
      typeof h['referer'] === 'string'
    );
  }

  private getCookieToken(req: any, cookieName: string): string | undefined {
    const raw = req.cookies?.[cookieName];
    if (typeof raw !== 'string') return undefined;
    const v = raw.trim();
    return v ? v : undefined;
  }

  private getHeaderToken(req: any, headerName: string): string | undefined {
    const key = String(headerName ?? '')
      .trim()
      .toLowerCase();
    if (!key) return undefined;

    const raw = req.headers?.[key] as string | string[] | undefined;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    return t ? t : undefined;
  }

  canActivate(context: ExecutionContext): boolean {
    const csrf = this.cfg.csrf();
    if (!csrf.enabled) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<FastifyRequest>() as any;
    const reply = http.getResponse<FastifyReply>();

    const isUnsafe = CSRF_METHODS.has(req.method);
    const browserLike = this.isBrowserLike(req);
    const hasAuth = this.hasAuthCookie(req);

    const cookieToken = this.getCookieToken(req, csrf.cookieName);
    const headerToken = this.getHeaderToken(req, csrf.headerName);

    // SAFE METHODS: issue CSRF cookie for browsers (even before login)
    if (!isUnsafe) {
      if (browserLike && !cookieToken) {
        const t = makeCsrfToken();
        reply.setCookie(csrf.cookieName, t, {
          httpOnly: false,
          secure: csrf.cookieSecure,
          sameSite: csrf.sameSite,
          path: '/',
          // no domain with __Host-
        });
      }
      return true;
    }

    // UNSAFE METHODS:
    // - If not browser-like => skip CSRF entirely (no complexity for Postman/mobile/server-to-server)
    if (!browserLike) return true;

    // - If browser-like but not using cookie-auth => skip CSRF (because CSRF threat relies on cookies)
    if (!hasAuth) return true;

    // Optional: origin/referer allowlist only for browsers
    const origin = req.headers?.origin as string | undefined;
    const referer = req.headers?.referer as string | undefined;

    const isProd = this.cfg.isProd();

    // In prod, if browser-like and has auth cookies, enforce origin/referer or sec-fetch-site.
    // Prefer sec-fetch-site when present (stronger).
    const secFetchSite = req.headers?.['sec-fetch-site'] as string | undefined;
    if (isProd && typeof secFetchSite === 'string') {
      const s = secFetchSite.toLowerCase();
      if (s !== 'same-origin' && s !== 'same-site') {
        throw new AppException({
          code: AppErrorCode.NOT_ALLOWED_BY_CORS,
          messageKey: 'errors.security.csrf.origin_not_allowed',
        });
      }
    } else {
      const allow = isAllowedByOriginOrReferer({
        origin,
        referer,
        originAllowlist: csrf.originAllowlist,
        refererAllowlist: csrf.refererAllowlist,
      });

      if (isProd && !allow) {
        throw new AppException({
          code: AppErrorCode.NOT_ALLOWED_BY_CORS,
          messageKey: 'errors.security.csrf.origin_not_allowed',
        });
      }
    }

    if (!cookieToken || !headerToken) {
      throw new AppException({
        code: AppErrorCode.FORBIDDEN,
        messageKey: 'errors.security.csrf.token_missing',
      });
    }

    if (headerToken !== cookieToken) {
      throw new AppException({
        code: AppErrorCode.FORBIDDEN,
        messageKey: 'errors.security.csrf.token_invalid',
      });
    }

    return true;
  }
}
