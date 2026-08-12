import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';
import type { EffectivePermissionsService } from '../services/effective-permissions.service.js';
import {
  buildAuthorizationRepoMock,
  buildEffectivePermissionsMock,
  type EffectivePermissionsMock,
} from './__test-support__/repository-mocks.js';
import { ReplaceUserPermissionsUseCase } from './replace-user-permissions.use-case.js';
import type { jest } from '@jest/globals';

describe('ReplaceUserPermissionsUseCase', () => {
  let repository: jest.Mocked<AuthorizationRepositoryPort>;
  let effective: EffectivePermissionsMock;
  let useCase: ReplaceUserPermissionsUseCase;

  beforeEach(() => {
    repository = buildAuthorizationRepoMock();
    effective = buildEffectivePermissionsMock();
    useCase = new ReplaceUserPermissionsUseCase(
      repository,
      effective as unknown as EffectivePermissionsService,
    );
  });

  it('replaces all overrides and refreshes authorization', async () => {
    const overrides = [
      { permissionKey: 'files:create', effect: 'ALLOW' as const },
      { permissionKey: 'files:delete', effect: 'DENY' as const },
    ];

    await useCase.execute('u1', overrides);

    expect(repository.replaceUserPermissions).toHaveBeenCalledWith(
      'u1',
      overrides,
    );
    expect(effective.refreshForUser).toHaveBeenCalledWith('u1');
  });
});
