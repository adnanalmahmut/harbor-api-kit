import type { UserEntity } from '#src/modules/users/domain/entities/user.entity.js';

export type CreateUserData = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  locale: string;
};

export interface UserRepositoryPort {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;
  create(data: CreateUserData): Promise<UserEntity>;
}
