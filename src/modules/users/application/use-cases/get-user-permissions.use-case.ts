import type { AuthorizationRepositoryPort } from '#src/modules/authorization/index.js';

export class GetUserPermissionsUseCase {
  constructor(
    private readonly authorizationRepo: AuthorizationRepositoryPort,
  ) {}

  async execute(userId: string) {
    return this.authorizationRepo.listUserOverrides(userId);
  }
}
