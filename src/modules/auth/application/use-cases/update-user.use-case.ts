import type { RequestContext } from '#src/core/context/request-context.type.js';
import type { User } from '../ports/auth-dtos.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class UpdateUserUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    input: Partial<User>,
    context: RequestContext,
  ): Promise<AuthResult<User>> {
    return this.authProvider.updateUser(input, context);
  }
}
