import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class ReactivateUserUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(email: string): Promise<AuthResult<void>> {
    return this.authProvider.reactivateUser(email);
  }
}
