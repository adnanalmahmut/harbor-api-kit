import type { RequestContext } from '#src/core/index.js';
import type {
  AuthProviderPort,
  AuthResult,
  CurrentSessionProviderPort,
  Session,
} from '../../domain/index.js';
import type { EffectivePermissionsService } from '#src/modules/rbac/index.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/index.js';

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
      const { data: sessionResult } = await this.authProvider.getSession({
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

export class ListSessionsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(context: RequestContext): Promise<AuthResult<Session[]>> {
    return this.authProvider.listSessions(context);
  }
}

export class RevokeOtherSessionsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(context: RequestContext): Promise<AuthResult<void>> {
    return this.authProvider.revokeOtherSessions(context);
  }
}

export class RevokeSessionUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    token: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    return this.authProvider.revokeSession(token, context);
  }
}

export class RevokeSessionsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    tokens: string[],
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    return this.authProvider.revokeSessions(tokens, context);
  }
}
