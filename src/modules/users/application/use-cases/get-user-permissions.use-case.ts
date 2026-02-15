import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';

export class GetUserPermissionsUseCase {
  constructor(private readonly grantsRepo: GrantsRepositoryPort) {}

  async execute(userId: string) {
    return this.grantsRepo.listUserOverrides(userId);
  }
}
