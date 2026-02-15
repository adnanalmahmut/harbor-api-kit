import type { ChangePasswordCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';

export class ChangePasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ChangePasswordCommand) {
    return this.authProvider.changePassword(command);
  }
}
