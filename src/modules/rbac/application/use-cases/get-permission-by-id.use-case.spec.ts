import { AppErrorCode } from '#src/core/index.js';
import { Permission } from '../../domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { buildPermissionRepoMock } from './__test-support__/repository-mocks.js';
import { GetPermissionByIdUseCase } from './get-permission-by-id.use-case.js';
import type { jest } from '@jest/globals';

describe('GetPermissionByIdUseCase', () => {
  let useCase: GetPermissionByIdUseCase;
  let mockRepo: jest.Mocked<PermissionRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildPermissionRepoMock();
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

  it('throws permissionNotFound RbacException when the id does not match', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toMatchObject({
      constructor: RbacException,
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'rbac.errors.permission_not_found',
      details: { id: 'missing' },
    });
  });
});
