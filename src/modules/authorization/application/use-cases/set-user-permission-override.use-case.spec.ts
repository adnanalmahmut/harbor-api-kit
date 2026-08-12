import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';
import type { EffectivePermissionsService } from '../services/effective-permissions.service.js';
import {
  buildAuthorizationRepoMock,
  buildEffectivePermissionsMock,
  type EffectivePermissionsMock,
} from './__test-support__/repository-mocks.js';
import { SetUserPermissionOverrideUseCase } from './set-user-permission-override.use-case.js';
import type { jest } from '@jest/globals';

describe('SetUserPermissionOverrideUseCase', () => {
  let repository: jest.Mocked<AuthorizationRepositoryPort>;
  let effective: EffectivePermissionsMock;
  let useCase: SetUserPermissionOverrideUseCase;

  beforeEach(() => {
    repository = buildAuthorizationRepoMock();
    effective = buildEffectivePermissionsMock();
    useCase = new SetUserPermissionOverrideUseCase(
      repository,
      effective as unknown as EffectivePermissionsService,
    );
  });

  it('stores the override and refreshes authorization', async () => {
    await useCase.execute({
      userId: 'u1',
      permissionKey: 'files:delete',
      effect: 'DENY',
      note: 'temporary',
    });

    expect(repository.setUserPermissionOverride).toHaveBeenCalledWith('u1', {
      permissionKey: 'files:delete',
      effect: 'DENY',
      note: 'temporary',
    });
    expect(effective.refreshForUser).toHaveBeenCalledWith('u1');
  });
});
