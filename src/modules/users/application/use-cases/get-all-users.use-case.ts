import type { User } from '../../domain/entities/user.entity.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';

export class GetAllUserUseCase {
  constructor(private readonly userRepo: UserRepositoryPort) {}

  execute(): Promise<User[] | null> {
    return this.userRepo.findAll();
  }
}
