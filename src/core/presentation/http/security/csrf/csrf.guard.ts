import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/domain/exceptions/error-definitions.js';
import type { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CSRF_METHODS } from './csrf.constants.js';
import { CSRF_EXEMPT_KEY } from './csrf.decorators.js';
import { isAllowedByOriginOrReferer, makeCsrfToken } from './csrf.util.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly cfg: AppConfigService,
    private readonly reflector?: Reflector,
  ) {}

  private isExempt(context: ExecutionContext): boolean {
    if (!this.reflector) return false;
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(CSRF_EXEMPT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }

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

  private issueCsrfCookieIfMissing(
    reply: FastifyReply,
    cookieName: string,
    secure: boolean,
    sameSite: 'lax' | 'strict' | 'none',
    existing?: string,
  ) {
    if (existing) return;
    const token = makeCsrfToken();
    reply.setCookie(cookieName, token, {
      httpOnly: false,
      secure,
      sameSite,
      path: '/',
    });
  }

  private assertOriginAllowed(
    req: FastifyRequest,
    csrf: ReturnType<AppConfigService['csrf']>,
  ) {
    if (!this.cfg.isProd()) return;

    const secFetchSite = req.headers?.['sec-fetch-site'] as string | undefined;
    if (typeof secFetchSite === 'string') {
      const s = secFetchSite.toLowerCase();
      if (s !== 'same-origin' && s !== 'same-site') {
        throw new AppException({
          code: AppErrorCode.NOT_ALLOWED_BY_CORS,
          messageKey: 'core.errors.security.csrf_origin_not_allowed',
        });
      }
      return;
    }

    const origin = req.headers?.origin;
    const referer = req.headers?.referer;

    const allow = isAllowedByOriginOrReferer({
      origin,
      referer,
      originAllowlist: csrf.originAllowlist,
      refererAllowlist: csrf.refererAllowlist,
    });

    if (!allow) {
      throw new AppException({
        code: AppErrorCode.NOT_ALLOWED_BY_CORS,
        messageKey: 'core.errors.security.csrf_origin_not_allowed',
      });
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const csrf = this.cfg.csrf();
    if (!csrf.enabled) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<FastifyRequest>() as any;
    const reply = http.getResponse<FastifyReply>();

    const isUnsafe = CSRF_METHODS.has(req.method);
    const hasAuth = this.hasAuthCookie(req);

    const cookieToken = this.getCookieToken(req, csrf.cookieName);
    const headerToken = this.getHeaderToken(req, csrf.headerName);

    if (!isUnsafe) {
      this.issueCsrfCookieIfMissing(
        reply,
        csrf.cookieName,
        csrf.cookieSecure,
        csrf.sameSite,
        cookieToken,
      );
      return true;
    }

    if (!hasAuth) {
      this.issueCsrfCookieIfMissing(
        reply,
        csrf.cookieName,
        csrf.cookieSecure,
        csrf.sameSite,
        cookieToken,
      );
      return true;
    }

    if (this.isExempt(context)) {
      return true;
    }

    this.assertOriginAllowed(req, csrf);

    if (!cookieToken || !headerToken) {
      if (!cookieToken && hasAuth) {
        this.issueCsrfCookieIfMissing(
          reply,
          csrf.cookieName,
          csrf.cookieSecure,
          csrf.sameSite,
          cookieToken,
        );
      }

      throw new AppException({
        code: AppErrorCode.FORBIDDEN,
        messageKey: !cookieToken
          ? 'core.errors.security.csrf_token_required'
          : 'core.errors.security.csrf_token_missing',
      });
    }

    if (headerToken !== cookieToken) {
      throw new AppException({
        code: AppErrorCode.FORBIDDEN,
        messageKey: 'core.errors.security.csrf_token_invalid',
      });
    }

    return true;
  }
}
