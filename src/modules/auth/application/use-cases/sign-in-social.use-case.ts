import type { SignInSocialCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { SignInResultData } from '#src/modules/auth/domain/ports/auth-dtos.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import type { AuthResult } from '#src/modules/auth/domain/ports/auth-result.js';

export class SignInSocialUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    cmd: SignInSocialCommand,
  ): Promise<AuthResult<SignInResultData>> {
    return this.authProvider.signInSocial(cmd);
  }
}
