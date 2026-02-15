import type { ResetPasswordCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';

export class ResetPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ResetPasswordCommand) {
    return this.authProvider.resetPassword(command);
  }
}
