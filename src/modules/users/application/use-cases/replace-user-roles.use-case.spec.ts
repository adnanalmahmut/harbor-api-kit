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
import { ReplaceUserRolesUseCase } from './replace-user-roles.use-case.js';
import type { jest } from '@jest/globals';

describe('ReplaceUserRolesUseCase', () => {
  let useCase: ReplaceUserRolesUseCase;
  let mockRoleRepo: jest.Mocked<RoleRepositoryPort>;
  let mockAuthProvider: jest.Mocked<AuthProviderPort>;
  let mockEffective: EffectivePermissionsMock;

  beforeEach(() => {
    mockRoleRepo = buildRoleRepoMock();
    mockAuthProvider = buildAuthProviderMock();
    mockEffective = buildEffectivePermissionsMock();
    useCase = new ReplaceUserRolesUseCase(
      mockRoleRepo,
      mockAuthProvider,
      mockEffective as unknown as EffectivePermissionsService,
    );
  });

  it('replaces the user roles and invalidates caches', async () => {
    mockRoleRepo.replaceUserRoles.mockResolvedValue(undefined);
    mockAuthProvider.invalidateUserSessions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    await useCase.execute('u1', ['r1', 'r2']);

    expect(mockRoleRepo.replaceUserRoles).toHaveBeenCalledWith('u1', [
      'r1',
      'r2',
    ]);
    expect(mockAuthProvider.invalidateUserSessions).toHaveBeenCalledWith('u1');
    expect(mockEffective.refreshForUser).toHaveBeenCalledWith('u1');
  });

  it('passes an empty array through to clear all roles', async () => {
    mockRoleRepo.replaceUserRoles.mockResolvedValue(undefined);
    mockAuthProvider.invalidateUserSessions.mockResolvedValue(undefined);
    mockEffective.refreshForUser.mockResolvedValue(undefined);

    await useCase.execute('u1', []);

    expect(mockRoleRepo.replaceUserRoles).toHaveBeenCalledWith('u1', []);
  });
});
