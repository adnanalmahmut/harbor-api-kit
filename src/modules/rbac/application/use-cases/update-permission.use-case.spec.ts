import { AppErrorCode } from '#src/core/index.js';
import { Permission } from '../../domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { buildPermissionRepoMock } from './__test-support__/repository-mocks.js';
import { UpdatePermissionUseCase } from './update-permission.use-case.js';
import type { jest } from '@jest/globals';

describe('UpdatePermissionUseCase', () => {
  let useCase: UpdatePermissionUseCase;
  let mockRepo: jest.Mocked<PermissionRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildPermissionRepoMock();
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

  it('throws permissionNotFound RbacException when the id does not match', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', { description: 'x' }),
    ).rejects.toMatchObject({
      constructor: RbacException,
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'rbac.errors.permission_not_found',
      details: { id: 'missing' },
    });
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
