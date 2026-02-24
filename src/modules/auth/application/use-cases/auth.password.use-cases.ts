import type { RequestContext } from '#src/core/index.js';
import type {
  AuthProviderPort,
  AuthResult,
  ChangePasswordCommand,
  ForgetPasswordCommand,
  ResetPasswordCommand,
} from '#src/modules/auth/domain/index.js';

export class ChangePasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ChangePasswordCommand) {
    return this.authProvider.changePassword(command);
  }
}

export class CheckResetTokenUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(token: string): Promise<AuthResult<boolean>> {
    return this.authProvider.validateResetToken(token);
  }
}

export class ForgetPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ForgetPasswordCommand) {
    const result = await this.authProvider.forgetPassword(command);
    return {
      cookies: result.cookies,
      data: undefined,
    };
  }
}

export class ResetPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ResetPasswordCommand) {
    return this.authProvider.resetPassword(command);
  }
}

export class VerifyPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    password: string,
    context: RequestContext,
  ): Promise<AuthResult<boolean>> {
    return this.authProvider.checkPassword(password, context);
  }
}
