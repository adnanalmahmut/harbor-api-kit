import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import type { AuthResult } from '#src/modules/auth/domain/ports/auth-result.js';

export class CheckResetTokenUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(token: string): Promise<AuthResult<boolean>> {
    return this.authProvider.validateResetToken(token);
  }
}
