import { AppException } from '#src/core/exceptions/app-exception.js';
import {
  AppErrorCode,
  ERROR_DEFINITIONS,
} from '#src/core/exceptions/error-definitions.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';
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

  async execute(command: AdminUpdateUserCommand): Promise<void> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) {
      throw new AppException({
        code: AppErrorCode.NOT_FOUND,
        messageKey: ERROR_DEFINITIONS.NOT_FOUND.messageKey,
        details: { userId: command.userId },
      });
    }

    // Apply updates
    if (command.firstName !== undefined) user.firstName = command.firstName;
    if (command.lastName !== undefined) user.lastName = command.lastName;
    if (command.email !== undefined) user.email = command.email;

    // Note: Changing email might require re-verification logic in a real app,
    // but for "Admin Update", we assume admin knows what they are doing (or we set verified=false).
    // For now, simple update.

    await this.userRepo.update(user);
  }
}
