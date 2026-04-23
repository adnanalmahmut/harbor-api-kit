import { Permission } from '../../domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { ListPermissionsUseCase } from './list-permissions.use-case.js';
import { jest } from '@jest/globals';

describe('ListPermissionsUseCase', () => {
  let useCase: ListPermissionsUseCase;
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
