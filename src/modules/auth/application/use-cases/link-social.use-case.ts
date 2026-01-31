import type { LinkSocialCommand } from '../ports/auth-commands.js';
import type { SignInResultData } from '../ports/auth-dtos.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class LinkSocialUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(cmd: LinkSocialCommand): Promise<AuthResult<SignInResultData>> {
    return this.authProvider.linkSocial(cmd);
  }
}
