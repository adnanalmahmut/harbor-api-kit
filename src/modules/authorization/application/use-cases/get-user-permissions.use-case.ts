import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';

export class GetUserPermissionsUseCase {
  constructor(
    private readonly authorizationRepo: AuthorizationRepositoryPort,
  ) {}

  async execute(userId: string) {
    return this.authorizationRepo.listUserOverrides(userId);
  }
}
