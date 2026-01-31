import type { AuthProviderPort, ResetPasswordCommand } from '../ports/index.js';

export class ResetPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ResetPasswordCommand) {
    return this.authProvider.resetPassword(command);
  }
}
