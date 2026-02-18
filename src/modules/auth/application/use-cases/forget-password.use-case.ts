import type { ForgetPasswordCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';

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
