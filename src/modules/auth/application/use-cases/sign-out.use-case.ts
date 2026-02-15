import { AuthCacheKeys } from '#src/modules/auth/application/cache/auth-cache.keys.js';
import type { SignOutCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';

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
