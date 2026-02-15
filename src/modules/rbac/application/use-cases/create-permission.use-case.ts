import { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';
import { z } from 'zod';

export const CreatePermissionSchema = z.object({
  action: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().optional(),
});

export type CreatePermissionCommand = z.infer<typeof CreatePermissionSchema>;

export class CreatePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepositoryPort) {}

  async execute(command: CreatePermissionCommand): Promise<Permission> {
    const permission = new Permission(
      crypto.randomUUID(),
      command.action,
      command.subject,
      0, // Index default
      command.description ?? null,
      new Date(),
      new Date(),
    );
    return this.permissionRepo.create(permission);
  }
}
