import type { User } from '../../domain/entities/user.entity.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';

export class GetUserByIdUseCase {
  constructor(private readonly userRepo: UserRepositoryPort) {}

  execute(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }
}
