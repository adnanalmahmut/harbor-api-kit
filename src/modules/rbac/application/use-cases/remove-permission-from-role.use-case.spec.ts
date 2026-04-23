import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import { RemovePermissionFromRoleUseCase } from './remove-permission-from-role.use-case.js';
import { jest } from '@jest/globals';

describe('RemovePermissionFromRoleUseCase', () => {
  let useCase: RemovePermissionFromRoleUseCase;
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
    useCase = new RemovePermissionFromRoleUseCase(mockRepo);
  });

  it('forwards roleId + permissionId to the grants repository', async () => {
    mockRepo.removePermissionFromRole.mockResolvedValue(undefined);

    await useCase.execute({ roleId: 'r1', permissionId: 'p1' });

    expect(mockRepo.removePermissionFromRole).toHaveBeenCalledWith('r1', 'p1');
  });
});
