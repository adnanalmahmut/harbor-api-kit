import type { RequestContext } from '#src/core/index.js';
import type {
  AuthEmailSenderPort,
  AuthProviderPort,
  AuthResult,
  ChangeEmailCommand,
  User,
} from '../../domain/index.js';
import type { UserRepositoryPort } from '#src/modules/users/index.js';

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

export class DeleteUserUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(context: RequestContext): Promise<AuthResult<void>> {
    return this.authProvider.deleteUser(context);
  }
}

export class ReactivateUserUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(email: string): Promise<AuthResult<void>> {
    return this.authProvider.reactivateUser(email);
  }
}
export class UpdateUserUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    input: Partial<User>,
    context: RequestContext,
  ): Promise<AuthResult<User>> {
    return this.authProvider.updateUser(input, context);
  }
}
