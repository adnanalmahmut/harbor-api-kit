import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import type { AuthProviderPort, SignInCommand } from '../ports/index.js';

export class LoginUserUseCase {
  constructor(
    private readonly authProvider: AuthProviderPort,
    private readonly roleRepo: RoleRepositoryPort,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async execute(command: SignInCommand) {
    // 1. Sign In
    const result = await this.authProvider.signInEmail(command);

    // Better Auth usually returns the session object.
    const sessionData = (result.data as any).session;

    if (sessionData && sessionData.token) {
      // Logic for caching if needed (Read-through optimization handled by AuthGuard later)
    }

    // 2. Enrich with Roles & Permissions
    if (result.data?.user) {
      const userId = result.data.user.id;
      const roles = await this.roleRepo.listRolesForUser(userId);
      const roleSlugs = roles.map((r) => r.slug);
      const perms = await this.effectivePermissions.buildForUser(userId);

      result.data.user.roles = roleSlugs;
      result.data.user.permissions = Array.from(perms.permissions);
    }

    return result;
  }
}
