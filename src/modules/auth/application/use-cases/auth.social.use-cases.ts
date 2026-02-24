import type { RequestContext } from '#src/core/index.js';
import type {
  AuthProviderPort,
  AuthResult,
  LinkedAccount,
  LinkSocialCommand,
  SignInResultData,
  SignInSocialCommand,
  UnlinkAccountCommand,
} from '#src/modules/auth/domain/index.js';

export class LinkSocialUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(cmd: LinkSocialCommand): Promise<AuthResult<SignInResultData>> {
    return this.authProvider.linkSocial(cmd);
  }
}

export class ListLinkedAccountsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(context: RequestContext): Promise<AuthResult<LinkedAccount[]>> {
    return this.authProvider.listLinkedAccounts(context);
  }
}

export class SignInSocialUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    cmd: SignInSocialCommand,
  ): Promise<AuthResult<SignInResultData>> {
    return this.authProvider.signInSocial(cmd);
  }
}

export class UnlinkAccountUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(cmd: UnlinkAccountCommand): Promise<AuthResult<void>> {
    return this.authProvider.unlinkAccount(cmd);
  }
}
