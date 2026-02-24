import { RbacException } from '#src/modules/rbac/application/exceptions/rbac.exception.js';
import {
  EffectivePermissionsService,
  type EffectivePermissions,
} from '#src/modules/rbac/application/services/effective-permissions.service.js';
import { PERMISSIONS_KEY } from '#src/modules/rbac/presentation/http/decorators/permissions.decorator.js';
import { ROLES_KEY } from '#src/modules/rbac/presentation/http/decorators/roles.decorator.js';
import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private effectivePermissions: EffectivePermissionsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RbacGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rolesRequirement = this.reflector.getAllAndOverride<
      { roles: string[]; mode: 'AND' | 'ANY' } | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    const permissionsRequirement = this.reflector.getAllAndOverride<
      { permissions: string[]; mode: 'AND' | 'ANY' } | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no RBAC requirements, allow.
    if (!rolesRequirement && !permissionsRequirement) {
      return true;
    }

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    // AuthGuard populates these.
    const user = (req as any).user;

    if (!user || !user.id) {
      this.logger.warn(
        '[rbac.check.failed] reason=no_user route=' + req.routeOptions?.url,
      );
      throw RbacException.unauthorizedAccess();
    }

    // Always use EffectivePermissionsService to ensure correct application of:
    // 1. Deny rules (which require the 'deny' set, not just the allowed list)
    // 2. Management escalation (subject:manage -> subject:action)
    // 3. Cache consistency
    const effective: EffectivePermissions =
      await this.effectivePermissions.buildForUser(user);

    // Check Roles
    if (rolesRequirement) {
      const { roles, mode } = rolesRequirement;
      const userRoles = effective.roles;
      const pass =
        mode === 'AND'
          ? roles.every((r) => userRoles.has(r))
          : roles.some((r) => userRoles.has(r));

      if (!pass) {
        this.logger.warn(
          `[rbac.check.failed] reason=missing_role userId=${user.id} required=${roles.join(',')} mode=${mode}`,
        );
        throw RbacException.missingRole(roles.join(', '));
      }
    }

    // Check Permissions
    if (permissionsRequirement) {
      const { permissions, mode } = permissionsRequirement;
      const checker = (p: string) => effective.has(p);

      const pass =
        mode === 'AND' ? permissions.every(checker) : permissions.some(checker);

      if (!pass) {
        this.logger.warn(
          `[rbac.check.failed] reason=missing_permission userId=${user.id} required=${permissions.join(',')} mode=${mode}`,
        );
        throw RbacException.missingPermission(permissions.join(', '));
      }
    }

    return true;
  }
}
