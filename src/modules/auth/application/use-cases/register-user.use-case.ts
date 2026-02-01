import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import type { AuthProviderPort, SignUpCommand } from '../ports/index.js';

import type { LoggerPort } from '#src/core/ports/logger.port.js';

export class RegisterUserUseCase {
  private static readonly DEFAULT_ROLE_SLUG = 'user';

  constructor(
    private readonly authProvider: AuthProviderPort,
    private readonly roleRepo: RoleRepositoryPort,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: SignUpCommand) {
    const result = await this.authProvider.signUpEmail(command);

    const userId = result?.data?.user?.id;
    if (!userId) {
      this.logger.error('auth.register.failed', { hasData: !!result?.data });
      return result;
    }

    await this.assignDefaultRoleSafe(userId);

    // Enrich with Roles & Permissions
    if (result.data?.user) {
      const roles = await this.roleRepo.listRolesForUser(userId);
      const roleSlugs = roles.map((r) => r.slug);
      const perms = await this.effectivePermissions.buildForUser(userId);

      result.data.user.roles = roleSlugs;
      result.data.user.permissions = Array.from(perms.permissions);
    }

    return result;
  }

  private async assignDefaultRoleSafe(userId: string): Promise<void> {
    const slug = RegisterUserUseCase.DEFAULT_ROLE_SLUG;
    try {
      const role = await this.roleRepo.findBySlug(slug);
      if (role) {
        await this.roleRepo.assignRoleToUser(userId, role.id);
      }
    } catch {
      this.logger.error('auth.role_assignment.failed', { roleSlug: slug });
    }
  }
}
