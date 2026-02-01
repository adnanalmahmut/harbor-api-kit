import type { RequestContext } from '#src/core/context/request-context.type.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class RevokeSessionsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    tokens: string[],
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    return this.authProvider.revokeSessions(tokens, context);
  }
}
