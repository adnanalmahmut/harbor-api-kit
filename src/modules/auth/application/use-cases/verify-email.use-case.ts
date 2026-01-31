import type { AuthProviderPort, VerifyEmailCommand } from '../ports/index.js';

export class VerifyEmailUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: VerifyEmailCommand) {
    return this.authProvider.verifyEmail(command);
  }
}
