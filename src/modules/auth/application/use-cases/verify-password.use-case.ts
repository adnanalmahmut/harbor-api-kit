import type { RequestContext } from '#src/core/context/request-context.type.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class VerifyPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    password: string,
    context: RequestContext,
  ): Promise<AuthResult<boolean>> {
    return this.authProvider.checkPassword(password, context);
  }
}
