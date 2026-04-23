import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { buildRoleRepoMock } from './__test-support__/repository-mocks.js';
import { DeleteRoleUseCase } from './delete-role.use-case.js';
import type { jest } from '@jest/globals';

describe('DeleteRoleUseCase', () => {
  let useCase: DeleteRoleUseCase;
  let mockRepo: jest.Mocked<RoleRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildRoleRepoMock();
    useCase = new DeleteRoleUseCase(mockRepo);
  });

  it('delegates to the repository to delete by id', async () => {
    mockRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('r1');

    expect(mockRepo.delete).toHaveBeenCalledWith('r1');
  });
});
