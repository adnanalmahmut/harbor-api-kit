import type { LoggerPort, RequestContext } from '#src/core/index.js';
import type {
  AuthProviderPort,
  AuthResult,
  SignInCommand,
  SignOutCommand,
  SignUpCommand,
  VerifyEmailCommand,
} from '../../domain/index.js';
import type { EffectivePermissionsService } from '#src/modules/rbac/index.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/index.js';
import { AuthCacheKeys } from '../auth.cache.js';

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
      const perms = await this.effectivePermissions.buildForUser(
        result.data.user,
      );

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
      const perms = await this.effectivePermissions.buildForUser(
        result.data.user,
      );

      result.data.user.roles = roleSlugs;
      result.data.user.permissions = Array.from(perms.permissions);
    }

    return result;
  }
}

export class SignOutUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: SignOutCommand) {
    const { context } = command;
    if (context.sessionToken && context.redis) {
      await context.redis.del(AuthCacheKeys.session(context.sessionToken));
    }
    return this.authProvider.signOut(command);
  }
}

export class SendVerificationEmailUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    email: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    return this.authProvider.requestVerificationEmail(email, context);
  }
}

export class VerifyEmailUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: VerifyEmailCommand) {
    return this.authProvider.verifyEmail(command);
  }
}
