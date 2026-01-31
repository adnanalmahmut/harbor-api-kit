import type { User } from '#src/modules/users/domain/entities/user.entity.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';

export class GetAllUserUseCase {
  constructor(private readonly userRepo: UserRepositoryPort) {}

  execute(): Promise<User[] | null> {
    return this.userRepo.findAll();
  }
}
