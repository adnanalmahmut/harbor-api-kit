import { UsersException } from '../exceptions/users.exception.js';
import { User } from '../../domain/entities/user.entity.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { z } from 'zod';

// We can define a schema locally or reuse one.
// Let's define one that allows updating basic profile info + email (maybe).
export const AdminUpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  // Add other fields as needed
});

export type AdminUpdateUserCommand = {
  userId: string;
} & z.infer<typeof AdminUpdateUserSchema>;

export class UpdateUserByIdUseCase {
  constructor(private readonly userRepo: UserRepositoryPort) {}

  async execute(command: AdminUpdateUserCommand): Promise<User> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) {
      throw UsersException.userNotFound(command.userId);
    }

    // Apply updates
    if (command.firstName !== undefined) user.firstName = command.firstName;
    if (command.lastName !== undefined) user.lastName = command.lastName;
    if (command.email !== undefined) user.email = command.email;

    // Note: Changing email might require re-verification logic in a real app,
    // but for "Admin Update", we assume admin knows what they are doing (or we set verified=false).
    // For now, simple update.

    return await this.userRepo.update(user);
  }
}
