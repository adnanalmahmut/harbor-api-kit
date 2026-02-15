import { User } from '#src/modules/users/domain/entities/user.entity.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';
import { EmailVO } from '#src/modules/users/domain/value-objects/email.vo.js';
import { LocaleVO } from '#src/modules/users/domain/value-objects/locale.vo.js';
import { randomUUID } from 'crypto';
import { UsersException } from '../exceptions/users.exception.js';

export interface CreateUserCommand {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  locale?: string;
  image?: string;
  emailVerified?: boolean;
  roles?: string[];
  permissions?: string[];
}

export class CreateUserUseCase {
  constructor(private readonly userRepo: UserRepositoryPort) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const email = EmailVO.create(command.email);
    const locale = LocaleVO.create(command.locale);

    const exists = await this.userRepo.findByEmail(email.value);
    if (exists) {
      throw UsersException.conflict();
    }

    const newUser = new User(
      randomUUID(),
      command.name,
      command.firstName ?? null,
      command.lastName ?? null,
      email.value,
      command.emailVerified ?? false,
      command.image ?? null,
      locale.value,
      command.roles ?? [],
      command.permissions ?? [],
      new Date(),
      new Date(),
    );

    return this.userRepo.create(newUser);
  }
}
