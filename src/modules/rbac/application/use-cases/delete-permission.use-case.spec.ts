import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { DeletePermissionUseCase } from './delete-permission.use-case.js';
import { jest } from '@jest/globals';

describe('DeletePermissionUseCase', () => {
  let useCase: DeletePermissionUseCase;
  let mockRepo: jest.Mocked<PermissionRepositoryPort>;

  beforeEach(() => {
    mockRepo = {
      listAll: jest.fn(),
      findById: jest.fn(),
      findByKey: jest.fn(),
      findManyByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<PermissionRepositoryPort>;
    useCase = new DeletePermissionUseCase(mockRepo);
  });

  it('delegates to the repository to delete by id', async () => {
    mockRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('p1');

    expect(mockRepo.delete).toHaveBeenCalledWith('p1');
  });
});
