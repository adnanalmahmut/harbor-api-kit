import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import type { CurrentSessionProviderPort } from '#src/modules/auth/domain/ports/current-session.provider.port.js';
import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';

export class GetSessionUseCase {
  constructor(
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly roleRepo: RoleRepositoryPort,
    private readonly authProvider: AuthProviderPort,
    private readonly currentSession: CurrentSessionProviderPort,
  ) {}

  async execute() {
    const sessionCtx = await this.currentSession.get();
    if (!sessionCtx) return null;

    let user = sessionCtx.user;
    let session = sessionCtx.session;

    if (!user || !session) {
      const sessionResult = await this.authProvider.getSession({
        context: sessionCtx as any,
      });
      if (!sessionResult) return null;
      user = sessionResult.user;
      session = sessionResult.session;
    }

    const roles = await this.roleRepo.listRolesForUser(user.id);
    const roleSlugs = roles.map((r) => r.slug);

    const permsData = await this.effectivePermissions.buildForUser(user);

    return {
      user: {
        ...user,
        roles: roleSlugs,
        permissions: Array.from(permsData.permissions),
      },
      session,
    };
  }
}
