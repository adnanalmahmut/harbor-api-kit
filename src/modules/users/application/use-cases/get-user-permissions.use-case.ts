import type { GrantsRepositoryPort } from '#src/modules/rbac/index.js';

export class GetUserPermissionsUseCase {
  constructor(private readonly grantsRepo: GrantsRepositoryPort) {}

  async execute(userId: string) {
    return this.grantsRepo.listUserOverrides(userId);
  }
}
