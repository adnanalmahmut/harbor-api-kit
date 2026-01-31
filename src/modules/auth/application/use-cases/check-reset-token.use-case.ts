import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class CheckResetTokenUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(token: string): Promise<AuthResult<boolean>> {
    return this.authProvider.validateResetToken(token);
  }
}
