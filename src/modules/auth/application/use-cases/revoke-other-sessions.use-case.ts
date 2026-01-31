import type { RequestContext } from '#src/core/context/request-context.type.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class RevokeOtherSessionsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(context: RequestContext): Promise<AuthResult<void>> {
    return this.authProvider.revokeOtherSessions(context);
  }
}
