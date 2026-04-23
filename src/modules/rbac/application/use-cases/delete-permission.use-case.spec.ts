import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { buildPermissionRepoMock } from './__test-support__/repository-mocks.js';
import { DeletePermissionUseCase } from './delete-permission.use-case.js';
import type { jest } from '@jest/globals';

describe('DeletePermissionUseCase', () => {
  let useCase: DeletePermissionUseCase;
  let mockRepo: jest.Mocked<PermissionRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildPermissionRepoMock();
    useCase = new DeletePermissionUseCase(mockRepo);
  });

  it('delegates to the repository to delete by id', async () => {
    mockRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('p1');

    expect(mockRepo.delete).toHaveBeenCalledWith('p1');
  });
});
