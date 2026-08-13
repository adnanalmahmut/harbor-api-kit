import { authConfig } from '#src/config/index.js';
import { EffectivePermissionsService } from '#src/modules/authorization/effective-permissions.service.js';
import type { PermissionKey } from '#src/modules/authorization/permissions.catalog.js';
import { SessionTrackerPort } from './auth.ports.js';
import { BETTER_AUTH, type BetterAuthInstance } from './better-auth.js';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

const ADMIN_PERMISSION_BY_PATH: Readonly<
  Record<string, readonly PermissionKey[]>
> = {
  '/admin/set-role': ['user:set-role'],
  '/admin/get-user': ['user:get'],
  '/admin/create-user': ['user:create'],
  '/admin/update-user': ['user:update'],
  '/admin/list-users': ['user:list'],
  '/admin/list-user-sessions': ['session:list'],
  '/admin/unban-user': ['user:ban'],
  '/admin/ban-user': ['user:ban'],
  '/admin/impersonate-user': ['user:impersonate'],
  '/admin/stop-impersonating': ['user:impersonate'],
  '/admin/revoke-user-session': ['session:revoke'],
  '/admin/revoke-user-sessions': ['session:revoke'],
  '/admin/remove-user': ['user:delete'],
  '/admin/set-user-password': ['user:set-password'],
  '/admin/has-permission': ['user:manage'],
};

/**
 * Mounts Better Auth's own handler on the raw Fastify instance, deliberately
 * outside the Nest pipeline. Better Auth owns input validation, error codes,
 * status codes, response shape and CSRF/origin checks for every `/auth/*`
 * route; this class adds exactly one thing on top — an effective-permission
 * check in front of `/admin/*` so per-user DENY overrides stay authoritative,
 * because the admin plugin's own check is role-only.
 *
 * Consequences (documented in docs/auth-authorization.md): these routes do not
 * pass through `CsrfGuard`, `ResponseInterceptor` (no `{success, message, data}`
 * envelope) or `GlobalExceptionFilter`.
 */
@Injectable()
export class BetterAuthRouteRegistrar implements OnModuleInit {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(BETTER_AUTH)
    private readonly auth: BetterAuthInstance,
    @Inject(authConfig.KEY)
    private readonly configuration: ConfigType<typeof authConfig>,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly sessionTracker: SessionTrackerPort,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BetterAuthRouteRegistrar.name);
  }

  onModuleInit(): void {
    const fastify = this.adapterHost.httpAdapter.getInstance<FastifyInstance>();
    const configuredUrl = new URL(this.configuration.betterAuthUrl);
    const basePath = configuredUrl.pathname.replace(/\/$/, '') || '/api/auth';

    fastify.route({
      method: ['GET', 'POST'],
      url: `${basePath}/*`,
      handler: async (request, reply) => {
        await this.handle(request, reply, configuredUrl.origin, basePath);
      },
    });
  }

  private async handle(
    request: FastifyRequest,
    reply: FastifyReply,
    baseUrl: string,
    basePath: string,
  ): Promise<void> {
    try {
      const headers = fromNodeHeaders(request.headers);
      const url = new URL(request.url, baseUrl);
      const relativePath = url.pathname.slice(basePath.length);

      if (relativePath.startsWith('/admin/')) {
        const allowed = await this.authorizeAdminRoute(
          relativePath,
          headers,
          request.body,
        );
        if (!allowed) {
          reply.status(403).send({
            code: 'FORBIDDEN',
            message: 'You are not allowed to perform this action.',
          });
          return;
        }
      }

      const body = this.serializeBody(request.body);
      const response = await this.auth.handler(
        new Request(url, {
          method: request.method,
          headers,
          ...(body === undefined ? {} : { body }),
        }),
      );

      if (response.ok) {
        await this.invalidateAuthorizationAfterMutation(
          relativePath,
          request.body,
        );
      }

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'set-cookie') reply.header(key, value);
      });
      const responseHeaders = response.headers as Headers & {
        getSetCookie?: () => string[];
      };
      const cookies = responseHeaders.getSetCookie?.() ?? [];
      if (cookies.length > 0) reply.header('set-cookie', cookies);

      if (!response.body) {
        reply.send();
        return;
      }
      // Forwarded verbatim: Better Auth owns the payload shape, validation
      // errors and status codes for these routes.
      reply.send(await response.text());
    } catch (error) {
      this.logger.error({ error }, 'Better Auth native route failed');
      reply.status(500).send({
        code: 'AUTH_FAILURE',
        message: 'Internal authentication error.',
      });
    }
  }

  private async authorizeAdminRoute(
    path: string,
    headers: Headers,
    body: unknown,
  ): Promise<boolean> {
    const permissions = ADMIN_PERMISSION_BY_PATH[path];
    if (!permissions) return false;
    const session = await this.auth.api.getSession({ headers });
    if (!session?.user.id) return false;
    const effective = await this.effectivePermissions.buildForUser({
      id: session.user.id,
    });
    return this.requiredPermissions(path, body, permissions).every(
      (permission) => effective.has(permission),
    );
  }

  private requiredPermissions(
    path: string,
    body: unknown,
    base: readonly PermissionKey[],
  ): PermissionKey[] {
    const required = new Set(base);
    if (!this.isRecord(body)) return [...required];

    if (path === '/admin/create-user' && 'role' in body) {
      required.add('user:set-role');
    }
    if (path === '/admin/update-user' && this.isRecord(body.data)) {
      if ('role' in body.data) required.add('user:set-role');
      if (
        'banned' in body.data ||
        'banReason' in body.data ||
        'banExpires' in body.data
      ) {
        required.add('user:ban');
      }
    }
    return [...required];
  }

  private serializeBody(body: unknown): BodyInit | undefined {
    if (body === undefined || body === null) return undefined;
    if (typeof body === 'string') return body;
    if (body instanceof Uint8Array) return Buffer.from(body).toString();
    return JSON.stringify(body);
  }

  private async invalidateAuthorizationAfterMutation(
    path: string,
    body: unknown,
  ): Promise<void> {
    const invalidatingPaths = new Set([
      '/admin/set-role',
      '/admin/update-user',
      '/admin/ban-user',
      '/admin/unban-user',
      '/admin/remove-user',
    ]);
    if (!invalidatingPaths.has(path) || !this.isBodyWithUserId(body)) return;

    await Promise.all([
      this.effectivePermissions.refreshForUser(body.userId),
      this.sessionTracker.invalidateUserSessions(body.userId),
    ]);
  }

  private isBodyWithUserId(body: unknown): body is { userId: string } {
    return (
      typeof body === 'object' &&
      body !== null &&
      'userId' in body &&
      typeof body.userId === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
