import { Permission } from '../../domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { GetPermissionByIdUseCase } from './get-permission-by-id.use-case.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { jest } from '@jest/globals';

describe('GetPermissionByIdUseCase', () => {
  let useCase: GetPermissionByIdUseCase;
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
    useCase = new GetPermissionByIdUseCase(mockRepo);
  });

  it('returns the permission when it exists', async () => {
    const perm = new Permission(
      'p1',
      'read',
      'posts',
      0,
      null,
      new Date(),
      new Date(),
    );
    mockRepo.findById.mockResolvedValue(perm);

    const result = await useCase.execute('p1');

    expect(result).toBe(perm);
    expect(mockRepo.findById).toHaveBeenCalledWith('p1');
  });

  it('throws RbacException when the permission is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      RbacException,
    );
  });
});
