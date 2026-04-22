import {
  AppConfigService,
  assertAllowedRedirectURL,
  CORE_TOKENS,
  InvalidRedirectURLError,
  makeCsrfToken,
  type RequestContext,
  type RequestContextStorePort,
} from '#src/core/index.js';
import { AuthException } from '../../application/index.js';
import { Inject, Injectable } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Injectable()
export class AuthHttpSupport {
  constructor(
    @Inject(CORE_TOKENS.REQUEST_CONTEXT_STORE)
    private readonly contextStore: RequestContextStorePort,
    private readonly config: AppConfigService,
  ) {}

  requireContext(): RequestContext {
    const ctx = this.contextStore.get();
    if (!ctx) throw AuthException.internalError();
    return ctx;
  }

  validateCallbackURL(url?: string): void {
    try {
      const frontendPublicUrl = this.config.app().frontendPublicUrl;
      const allowedOrigins = this.config.auth().redirectAllowlist;
      assertAllowedRedirectURL(url, [frontendPublicUrl, ...allowedOrigins]);
    } catch (e) {
      if (e instanceof InvalidRedirectURLError) {
        throw AuthException.invalidRequest();
      }
      throw e;
    }
  }

  issueCsrfCookie(reply: FastifyReply) {
    const csrf = this.config.csrf();
    if (!csrf.enabled) return;

    const token = makeCsrfToken();
    reply.setCookie(csrf.cookieName, token, {
      httpOnly: false,
      secure: csrf.cookieSecure,
      sameSite: csrf.sameSite,
      path: '/',
    });
  }
}
