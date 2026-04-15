import { Role } from '../../domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  isSystem: z.boolean().optional().default(false),
});

export type CreateRoleCommand = z.infer<typeof CreateRoleSchema>;

export class CreateRoleUseCase {
  constructor(private readonly roleRepo: RoleRepositoryPort) {}

  async execute(command: CreateRoleCommand): Promise<Role> {
    const role = new Role(
      crypto.randomUUID(),
      command.name,
      command.slug,
      command.description ?? null,
      command.isSystem ?? false,
      new Date(),
      new Date(),
    );
    return this.roleRepo.create(role);
  }
}
