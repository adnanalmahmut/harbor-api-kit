import type { RequestContext } from '#src/core/domain/context/request-context.type.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import type { AuthResult } from '#src/modules/auth/domain/ports/auth-result.js';

export class VerifyPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    password: string,
    context: RequestContext,
  ): Promise<AuthResult<boolean>> {
    return this.authProvider.checkPassword(password, context);
  }
}
