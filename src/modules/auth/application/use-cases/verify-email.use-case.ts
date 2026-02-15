import type { VerifyEmailCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';

export class VerifyEmailUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: VerifyEmailCommand) {
    return this.authProvider.verifyEmail(command);
  }
}
