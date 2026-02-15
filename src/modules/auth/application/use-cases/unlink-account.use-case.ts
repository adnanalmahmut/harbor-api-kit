import type { UnlinkAccountCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import type { AuthResult } from '#src/modules/auth/domain/ports/auth-result.js';

export class UnlinkAccountUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(cmd: UnlinkAccountCommand): Promise<AuthResult<void>> {
    return this.authProvider.unlinkAccount(cmd);
  }
}
