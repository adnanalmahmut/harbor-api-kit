import type { AuthProviderPort } from '#src/modules/auth/index.js';
import type {
  EffectivePermissionsService,
  RoleRepositoryPort,
} from '#src/modules/rbac/index.js';
import {
  buildAuthProviderMock,
  buildEffectivePermissionsMock,
  buildRoleRepoMock,
  type EffectivePermissionsMock,
} from './__test-support__/repository-mocks.js';
import { RemoveRoleFromUserUseCase } from './remove-role-from-user.use-case.js';
import type { jest } from '@jest/globals';

describe('RemoveRoleFromUserUseCase', () => {
  let useCase: RemoveRoleFromUserUseCase;
  let mockRoleRepo: jest.Mocked<RoleRepositoryPort>;
  let mockAuthProvider: jest.Mocked<AuthProviderPort>;
  let mockEffective: EffectivePermissionsMock;

  beforeEach(() => {
    mockRoleRepo = buildRoleRepoMock();
    mockAuthProvider = buildAuthProviderMock();
    mockEffective = buildEffectivePermissionsMock();
    useCase = new RemoveRoleFromUserUseCase(
      mockRoleRepo,
      mockAuthProvider,
      mockEffective as unknown as EffectivePermissionsService,
    );
  });

  it('removes the role and invalidates caches on success', async () => {
    mockRoleRepo.removeRoleFromUser.mockResolvedValue(undefined);
    mockAuthProvider.invalidateUserSessions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    await useCase.execute({ userId: 'u1', roleId: 'r1' });

    expect(mockRoleRepo.removeRoleFromUser).toHaveBeenCalledWith('u1', 'r1');
    expect(mockAuthProvider.invalidateUserSessions).toHaveBeenCalledWith('u1');
    expect(mockEffective.refreshForUser).toHaveBeenCalledWith('u1');
  });
});
