import type { RequestContext } from '#src/core/domain/context/request-context.type.js';
import type { User } from '#src/modules/auth/domain/ports/auth-dtos.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import type { AuthResult } from '#src/modules/auth/domain/ports/auth-result.js';

export class UpdateUserUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    input: Partial<User>,
    context: RequestContext,
  ): Promise<AuthResult<User>> {
    return this.authProvider.updateUser(input, context);
  }
}
