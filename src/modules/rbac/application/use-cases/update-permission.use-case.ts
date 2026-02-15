import { RbacException } from '#src/modules/rbac/application/exceptions/rbac.exception.js';
import type { PermissionRepositoryPort } from '#src/modules/rbac/domain/ports/permission.repository.port.js';
import { z } from 'zod';

export const UpdatePermissionSchema = z.object({
  description: z.string().optional(),
  // Enforce canonical key immutability usually, unless explicitly allowed.
  // The plan said "do NOT allow changing the canonical key if it is a contract".
  // So we only allow description for now, maybe index?
  // Let's only allow description update to be safe as per "Non-negotiables".
});

export type UpdatePermissionCommand = z.infer<typeof UpdatePermissionSchema>;

export class UpdatePermissionUseCase {
  constructor(private readonly permissionRepo: PermissionRepositoryPort) {}

  async execute(permissionId: string, command: UpdatePermissionCommand) {
    const permission = await this.permissionRepo.findById(permissionId);
    if (!permission) {
      throw RbacException.permissionNotFound(permissionId);
    }
    return this.permissionRepo.update(permissionId, command);
  }
}
