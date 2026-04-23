import { Permission } from '../../domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { UpdatePermissionUseCase } from './update-permission.use-case.js';
import { jest } from '@jest/globals';

describe('UpdatePermissionUseCase', () => {
  let useCase: UpdatePermissionUseCase;
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
    useCase = new UpdatePermissionUseCase(mockRepo);
  });

  it('updates a permission description when it exists', async () => {
    const existing = new Permission(
      'p1',
      'read',
      'posts',
      0,
      null,
      new Date(),
      new Date(),
    );
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.update.mockImplementation((_id, diff) =>
      Promise.resolve({ ...existing, ...diff } as Permission),
    );

    const result = await useCase.execute('p1', { description: 'new desc' });

    expect(result.description).toBe('new desc');
    expect(mockRepo.update).toHaveBeenCalledWith('p1', {
      description: 'new desc',
    });
  });

  it('throws RbacException when the permission is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', { description: 'x' }),
    ).rejects.toBeInstanceOf(RbacException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
