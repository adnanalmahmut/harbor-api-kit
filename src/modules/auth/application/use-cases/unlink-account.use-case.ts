import type { UnlinkAccountCommand } from '../ports/auth-commands.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class UnlinkAccountUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(cmd: UnlinkAccountCommand): Promise<AuthResult<void>> {
    return this.authProvider.unlinkAccount(cmd);
  }
}
