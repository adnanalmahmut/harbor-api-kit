import type { User } from '../entities/user.entity.js';

export interface UserRepositoryPort {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[] | null>;
  update(user: User): Promise<User>;
}
