import type { EffectivePermissions } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import { RbacException } from '#src/modules/rbac/domain/exceptions/rbac.exception.js';
import { PERMISSIONS_KEY } from '#src/modules/rbac/presentation/http/decorators/permissions.decorator.js';
import { ROLES_KEY } from '#src/modules/rbac/presentation/http/decorators/roles.decorator.js';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private reflector: Reflector,
    private effectivePermissions: EffectivePermissionsService,
  ) {}

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
      this.logger.warn('RbacGuard ran but no userId found. Did AuthGuard run?');
      throw RbacException.forbidden();
    }

    // Always use EffectivePermissionsService to ensure correct application of:
    // 1. Deny rules (which require the 'deny' set, not just the allowed list)
    // 2. Management escalation (subject:manage -> subject:action)
    // 3. Cache consistency
    const effective: EffectivePermissions =
      await this.effectivePermissions.buildForUser(user.id);

    // Check Roles
    if (rolesRequirement) {
      const { roles, mode } = rolesRequirement;
      const userRoles = effective.roles;
      const pass =
        mode === 'AND'
          ? roles.every((r) => userRoles.has(r))
          : roles.some((r) => userRoles.has(r));

      if (!pass) throw RbacException.forbidden();
    }

    // Check Permissions
    if (permissionsRequirement) {
      const { permissions, mode } = permissionsRequirement;
      const checker = (p: string) => effective.has(p);

      const pass =
        mode === 'AND' ? permissions.every(checker) : permissions.some(checker);

      if (!pass) throw RbacException.forbidden();
    }

    return true;
  }
}
