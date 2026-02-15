import type { ChangeEmailCommand } from '#src/modules/auth/domain/ports/auth-commands.js';
import type { AuthEmailSenderPort } from '#src/modules/auth/domain/ports/auth-email.sender.port.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';

export class ChangeEmailUseCase {
  constructor(
    private readonly authProvider: AuthProviderPort,
    private readonly authEmailSender: AuthEmailSenderPort,
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(command: ChangeEmailCommand) {
    const { newEmail, callbackURL, context } = command;

    const result = await this.authProvider.changeEmail({
      newEmail,
      callbackURL,
      context,
    });

    const token = result.data.token;

    if (token && context.userId) {
      const user = await this.userRepo.findById(context.userId);
      if (user) {
        await this.authEmailSender.sendChangeEmailVerification(
          {
            user: {
              email: user.email,
              firstName: user.firstName ?? undefined,
              lastName: user.lastName ?? undefined,
              name: user.name,
              locale: user.locale,
            },
            token,
            newEmail,
          },
          context,
        );
      }
    }

    // We do not return the token to the client for security/cleanliness
    return {
      cookies: result.cookies,
      data: undefined,
    };
  }
}
