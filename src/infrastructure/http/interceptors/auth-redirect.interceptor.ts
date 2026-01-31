import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import {
  Injectable,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { catchError, EMPTY, map, type Observable } from 'rxjs';

export const REDIRECT_METADATA_KEY = 'auth:redirect';

export interface RedirectConfig {
  successPath: string;
  errorPath: string;
  errorReason: string;
  /**
   * Route param name to include in success redirect URL.
   * e.g., 'token' will append ?token={value} to successPath
   */
  tokenParam?: string;
}

/**
 * Decorator to mark an endpoint for frontend redirect behavior.
 * On success, redirects to successPath.
 * On error, redirects to errorPath with ?reason=errorReason
 */
export const RedirectOnResult = (config: RedirectConfig) =>
  SetMetadata(REDIRECT_METADATA_KEY, config);

@Injectable()
export class AuthRedirectInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const redirectConfig = this.reflector.get<RedirectConfig | undefined>(
      REDIRECT_METADATA_KEY,
      context.getHandler(),
    );

    // If no redirect config, pass through normally
    if (!redirectConfig) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<FastifyRequest>();
    const reply = httpContext.getResponse<FastifyReply>();
    const frontendUrl = this.config.frontend().url;

    return next.handle().pipe(
      map(() => {
        // Build success URL
        let successUrl = `${frontendUrl}${redirectConfig.successPath}`;

        // If tokenParam is specified, append it to the URL
        if (redirectConfig.tokenParam) {
          const params = request.params as Record<string, string>;
          const tokenValue = params[redirectConfig.tokenParam];
          if (tokenValue) {
            successUrl += `?${redirectConfig.tokenParam}=${tokenValue}`;
          }
        }

        // Set status explicitly and redirect
        reply.status(302).header('Location', successUrl).send();
        return undefined;
      }),
      catchError(() => {
        // Error: redirect to error path with reason
        const errorUrl = `${frontendUrl}${redirectConfig.errorPath}?reason=${redirectConfig.errorReason}`;
        reply.status(302).header('Location', errorUrl).send();
        return EMPTY;
      }),
    );
  }
}
