import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import { buildGrantsRepoMock } from './__test-support__/repository-mocks.js';
import { AssignPermissionToRoleUseCase } from './assign-permission-to-role.use-case.js';
import type { jest } from '@jest/globals';

describe('AssignPermissionToRoleUseCase', () => {
  let useCase: AssignPermissionToRoleUseCase;
  let mockRepo: jest.Mocked<GrantsRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildGrantsRepoMock();
    useCase = new AssignPermissionToRoleUseCase(mockRepo);
  });

  it('forwards roleId + permissionId to the grants repository', async () => {
    mockRepo.assignPermissionToRole.mockResolvedValue(undefined);

    await useCase.execute({ roleId: 'r1', permissionId: 'p1' });

    expect(mockRepo.assignPermissionToRole).toHaveBeenCalledWith('r1', 'p1');
  });
});
