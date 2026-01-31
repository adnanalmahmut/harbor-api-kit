import type {
  AuthProviderPort,
  ForgetPasswordCommand,
} from '../ports/index.js';

export class ForgetPasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ForgetPasswordCommand) {
    // Return result directly which includes data and cookies
    // Return result directly which includes data and cookies
    const result = await this.authProvider.forgetPassword(command);
    return {
      cookies: result.cookies,
      data: undefined,
    };
  }
}
