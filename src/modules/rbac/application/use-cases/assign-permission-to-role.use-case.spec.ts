import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import { AssignPermissionToRoleUseCase } from './assign-permission-to-role.use-case.js';
import { jest } from '@jest/globals';

describe('AssignPermissionToRoleUseCase', () => {
  let useCase: AssignPermissionToRoleUseCase;
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
    useCase = new AssignPermissionToRoleUseCase(mockRepo);
  });

  it('forwards roleId + permissionId to the grants repository', async () => {
    mockRepo.assignPermissionToRole.mockResolvedValue(undefined);

    await useCase.execute({ roleId: 'r1', permissionId: 'p1' });

    expect(mockRepo.assignPermissionToRole).toHaveBeenCalledWith('r1', 'p1');
  });
});
