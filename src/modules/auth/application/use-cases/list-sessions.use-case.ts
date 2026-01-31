import type { RequestContext } from '#src/core/context/request-context.type.js';
import type { Session } from '../ports/auth-dtos.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class ListSessionsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(context: RequestContext): Promise<AuthResult<Session[]>> {
    return this.authProvider.listSessions(context);
  }
}
