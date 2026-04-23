import type { AuthProviderPort } from '#src/modules/auth/index.js';
import type {
  EffectivePermissionsService,
  GrantsRepositoryPort,
} from '#src/modules/rbac/index.js';
import {
  buildAuthProviderMock,
  buildEffectivePermissionsMock,
  buildGrantsRepoMock,
  type EffectivePermissionsMock,
} from './__test-support__/repository-mocks.js';
import { RemoveUserPermissionOverrideUseCase } from './remove-user-permission-override.use-case.js';
import type { jest } from '@jest/globals';

describe('RemoveUserPermissionOverrideUseCase', () => {
  let useCase: RemoveUserPermissionOverrideUseCase;
  let mockGrantsRepo: jest.Mocked<GrantsRepositoryPort>;
  let mockAuthProvider: jest.Mocked<AuthProviderPort>;
  let mockEffective: EffectivePermissionsMock;

  beforeEach(() => {
    mockGrantsRepo = buildGrantsRepoMock();
    mockAuthProvider = buildAuthProviderMock();
    mockEffective = buildEffectivePermissionsMock();
    useCase = new RemoveUserPermissionOverrideUseCase(
      mockGrantsRepo,
      mockAuthProvider,
      mockEffective as unknown as EffectivePermissionsService,
    );
  });

  it('removes the override and invalidates caches', async () => {
    mockGrantsRepo.removeUserPermissionOverride.mockResolvedValue(undefined);
    mockAuthProvider.invalidateUserSessions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    await useCase.execute({ userId: 'u1', permissionId: 'p1' });

    expect(mockGrantsRepo.removeUserPermissionOverride).toHaveBeenCalledWith(
      'u1',
      'p1',
    );
    expect(mockAuthProvider.invalidateUserSessions).toHaveBeenCalledWith('u1');
    expect(mockEffective.refreshForUser).toHaveBeenCalledWith('u1');
  });
});
