import type {
  AuthorizationRepositoryPort,
  EffectivePermissionsService,
} from '#src/modules/authorization/index.js';
import {
  buildAuthorizationRepoMock,
  buildEffectivePermissionsMock,
  type EffectivePermissionsMock,
} from './__test-support__/repository-mocks.js';
import { RemoveUserPermissionOverrideUseCase } from './remove-user-permission-override.use-case.js';
import type { jest } from '@jest/globals';

describe('RemoveUserPermissionOverrideUseCase', () => {
  let repository: jest.Mocked<AuthorizationRepositoryPort>;
  let effective: EffectivePermissionsMock;
  let useCase: RemoveUserPermissionOverrideUseCase;

  beforeEach(() => {
    repository = buildAuthorizationRepoMock();
    effective = buildEffectivePermissionsMock();
    useCase = new RemoveUserPermissionOverrideUseCase(
      repository,
      effective as unknown as EffectivePermissionsService,
    );
  });

  it('removes the override and refreshes authorization', async () => {
    await useCase.execute({
      userId: 'u1',
      permissionKey: 'files:delete',
    });

    expect(repository.removeUserPermissionOverride).toHaveBeenCalledWith(
      'u1',
      'files:delete',
    );
    expect(effective.refreshForUser).toHaveBeenCalledWith('u1');
  });
});
