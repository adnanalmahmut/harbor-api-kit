import { User } from '../../domain/entities/user.entity.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { EmailVO } from '../../domain/value-objects/email.vo.js';
import { LocaleVO } from '../../domain/value-objects/locale.vo.js';
import { randomUUID } from 'crypto';
import { UsersException } from '../exceptions/users.exception.js';

export interface CreateUserCommand {
  email: string;
  firstName: string;
  lastName: string;
  locale?: string;
  image?: string;
  emailVerified?: boolean;
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
      command.firstName,
      command.lastName,
      email.value,
      command.emailVerified ?? false,
      command.image ?? '',
      locale.value,
      ['user'],
      [],
      new Date(),
      new Date(),
    );

    return this.userRepo.create(newUser);
  }
}
