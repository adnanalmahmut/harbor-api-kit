import type {
  AuthProviderPort,
  ChangePasswordCommand,
} from '../ports/index.js';

export class ChangePasswordUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(command: ChangePasswordCommand) {
    return this.authProvider.changePassword(command);
  }
}
