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
import { SetUserPermissionOverrideUseCase } from './set-user-permission-override.use-case.js';
import type { jest } from '@jest/globals';

describe('SetUserPermissionOverrideUseCase', () => {
  let useCase: SetUserPermissionOverrideUseCase;
  let mockGrantsRepo: jest.Mocked<GrantsRepositoryPort>;
  let mockAuthProvider: jest.Mocked<AuthProviderPort>;
  let mockEffective: EffectivePermissionsMock;

  beforeEach(() => {
    mockGrantsRepo = buildGrantsRepoMock();
    mockAuthProvider = buildAuthProviderMock();
    mockEffective = buildEffectivePermissionsMock();
    useCase = new SetUserPermissionOverrideUseCase(
      mockGrantsRepo,
      mockAuthProvider,
      mockEffective as unknown as EffectivePermissionsService,
    );
  });

  it('persists an ALLOW override and invalidates caches', async () => {
    mockGrantsRepo.setUserPermissionOverride.mockResolvedValue(undefined);
    mockAuthProvider.invalidateUserSessions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    await useCase.execute({
      userId: 'u1',
      permissionId: 'p1',
      effect: 'ALLOW',
    });

    expect(mockGrantsRepo.setUserPermissionOverride).toHaveBeenCalledWith(
      'u1',
      'p1',
      'ALLOW',
    );
    expect(mockAuthProvider.invalidateUserSessions).toHaveBeenCalledWith('u1');
    expect(mockEffective.refreshForUser).toHaveBeenCalledWith('u1');
  });

  it('persists a DENY override with the same invalidation flow', async () => {
    mockGrantsRepo.setUserPermissionOverride.mockResolvedValue(undefined);
    mockAuthProvider.invalidateUserSessions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    await useCase.execute({
      userId: 'u1',
      permissionId: 'p1',
      effect: 'DENY',
    });

    expect(mockGrantsRepo.setUserPermissionOverride).toHaveBeenCalledWith(
      'u1',
      'p1',
      'DENY',
    );
  });
});
