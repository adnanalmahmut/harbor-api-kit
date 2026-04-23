import type {
  EffectivePermissionsService,
  GrantsRepositoryPort,
} from '#src/modules/rbac/index.js';
import {
  buildEffectivePermissionsMock,
  buildGrantsRepoMock,
  type EffectivePermissionsMock,
} from './__test-support__/repository-mocks.js';
import { ReplaceUserPermissionsUseCase } from './replace-user-permissions.use-case.js';
import type { jest } from '@jest/globals';

describe('ReplaceUserPermissionsUseCase', () => {
  let useCase: ReplaceUserPermissionsUseCase;
  let mockGrantsRepo: jest.Mocked<GrantsRepositoryPort>;
  let mockEffective: EffectivePermissionsMock;

  beforeEach(() => {
    mockGrantsRepo = buildGrantsRepoMock();
    mockEffective = buildEffectivePermissionsMock();
    useCase = new ReplaceUserPermissionsUseCase(
      mockGrantsRepo,
      mockEffective as unknown as EffectivePermissionsService,
    );
  });

  it('replaces the overrides and refreshes the effective cache', async () => {
    mockGrantsRepo.replaceUserPermissions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    const overrides = [
      { permissionId: 'p1', effect: 'ALLOW' as const },
      { permissionId: 'p2', effect: 'DENY' as const, note: 'temp' },
    ];
    await useCase.execute('u1', overrides);

    expect(mockGrantsRepo.replaceUserPermissions).toHaveBeenCalledWith(
      'u1',
      overrides,
    );
    expect(mockEffective.refreshForUser).toHaveBeenCalledWith('u1');
  });

  it('passes an empty list through to clear all overrides', async () => {
    mockGrantsRepo.replaceUserPermissions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    await useCase.execute('u1', []);

    expect(mockGrantsRepo.replaceUserPermissions).toHaveBeenCalledWith(
      'u1',
      [],
    );
  });
});
