import { AuthorizationException } from '../../../application/exceptions/authorization.exception.js';
import { EffectivePermissionsService } from '../../../application/services/effective-permissions.service.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { PermissionRequirement } from '../decorators/permissions.decorator.js';
import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PermissionsGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<
      PermissionRequirement | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!requirement) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user as { id?: string } | undefined;
    if (!user?.id) throw AuthorizationException.unauthorizedAccess();

    const effective = await this.effectivePermissions.buildForUser({
      id: user.id,
    });
    const passes =
      requirement.mode === 'AND'
        ? requirement.permissions.every((permission) =>
            effective.has(permission),
          )
        : requirement.permissions.some((permission) =>
            effective.has(permission),
          );

    if (!passes) {
      this.logger.warn(
        `[authorization.check.failed] reason=missing_permission userId=${user.id} required=${requirement.permissions.join(',')} mode=${requirement.mode}`,
      );
      throw AuthorizationException.missingPermission(
        requirement.permissions.join(', '),
      );
    }

    return true;
  }
}
