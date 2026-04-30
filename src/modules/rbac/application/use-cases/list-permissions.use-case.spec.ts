import { Permission } from '../../domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { buildPermissionRepoMock } from './__test-support__/repository-mocks.js';
import { ListPermissionsUseCase } from './list-permissions.use-case.js';
import type { jest } from '@jest/globals';

describe('ListPermissionsUseCase', () => {
  let useCase: ListPermissionsUseCase;
  let mockRepo: jest.Mocked<PermissionRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildPermissionRepoMock();
    useCase = new ListPermissionsUseCase(mockRepo);
  });

  it('returns the full list from the repository', async () => {
    const perms = [
      new Permission('p1', 'read', 'posts', 0, null, new Date(), new Date()),
      new Permission('p2', 'write', 'posts', 0, null, new Date(), new Date()),
    ];
    mockRepo.listAll.mockResolvedValue(perms);

    const result = await useCase.execute();

    expect(result).toEqual(perms);
    expect(mockRepo.listAll).toHaveBeenCalled();
  });

  it('returns an empty array when there are no permissions', async () => {
    mockRepo.listAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
