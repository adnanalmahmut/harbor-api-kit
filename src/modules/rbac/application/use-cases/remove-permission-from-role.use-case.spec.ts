import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import { buildGrantsRepoMock } from './__test-support__/repository-mocks.js';
import { RemovePermissionFromRoleUseCase } from './remove-permission-from-role.use-case.js';
import type { jest } from '@jest/globals';

describe('RemovePermissionFromRoleUseCase', () => {
  let useCase: RemovePermissionFromRoleUseCase;
  let mockRepo: jest.Mocked<GrantsRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildGrantsRepoMock();
    useCase = new RemovePermissionFromRoleUseCase(mockRepo);
  });

  it('forwards roleId + permissionId to the grants repository', async () => {
    mockRepo.removePermissionFromRole.mockResolvedValue(undefined);

    await useCase.execute({ roleId: 'r1', permissionId: 'p1' });

    expect(mockRepo.removePermissionFromRole).toHaveBeenCalledWith('r1', 'p1');
  });
});
