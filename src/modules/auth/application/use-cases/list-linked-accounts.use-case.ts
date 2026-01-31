import type { RequestContext } from '#src/core/context/request-context.type.js';
import type { LinkedAccount } from '../ports/auth-dtos.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class ListLinkedAccountsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(context: RequestContext): Promise<AuthResult<LinkedAccount[]>> {
    return this.authProvider.listLinkedAccounts(context);
  }
}
