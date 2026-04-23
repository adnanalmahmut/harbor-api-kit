import { Permission } from '../../domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import { GetRolePermissionsUseCase } from './get-role-permissions.use-case.js';
import { jest } from '@jest/globals';

describe('GetRolePermissionsUseCase', () => {
  let useCase: GetRolePermissionsUseCase;
  let mockRepo: jest.Mocked<GrantsRepositoryPort>;

  beforeEach(() => {
    mockRepo = {
      listPermissionsForRoleIds: jest.fn(),
      listUserOverrides: jest.fn(),
      assignPermissionToRole: jest.fn(),
      removePermissionFromRole: jest.fn(),
      setUserPermissionOverride: jest.fn(),
      removeUserPermissionOverride: jest.fn(),
      replaceRolePermissions: jest.fn(),
      replaceUserPermissions: jest.fn(),
    } as unknown as jest.Mocked<GrantsRepositoryPort>;
    useCase = new GetRolePermissionsUseCase(mockRepo);
  });

  it('returns the permissions granted to the given role', async () => {
    const perms = [
      new Permission('p1', 'read', 'posts', 0, null, new Date(), new Date()),
    ];
    mockRepo.listPermissionsForRoleIds.mockResolvedValue(perms);

    const result = await useCase.execute('r1');

    expect(result).toEqual(perms);
    expect(mockRepo.listPermissionsForRoleIds).toHaveBeenCalledWith(['r1']);
  });

  it('returns an empty list when the role has no permissions', async () => {
    mockRepo.listPermissionsForRoleIds.mockResolvedValue([]);

    const result = await useCase.execute('r1');

    expect(result).toEqual([]);
  });
});
