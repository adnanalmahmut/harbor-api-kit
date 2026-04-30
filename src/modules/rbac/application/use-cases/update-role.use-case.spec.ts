import { AppErrorCode } from '#src/core/index.js';
import { Role } from '../../domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { buildRoleRepoMock } from './__test-support__/repository-mocks.js';
import { UpdateRoleUseCase } from './update-role.use-case.js';
import type { jest } from '@jest/globals';

describe('UpdateRoleUseCase', () => {
  let useCase: UpdateRoleUseCase;
  let mockRepo: jest.Mocked<RoleRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildRoleRepoMock();
    useCase = new UpdateRoleUseCase(mockRepo);
  });

  it('updates a role when it exists', async () => {
    const existing = new Role(
      'r1',
      'Editor',
      'editor',
      null,
      false,
      new Date(),
      new Date(),
    );
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.update.mockImplementation((_id, diff) =>
      Promise.resolve({ ...existing, ...diff } as Role),
    );

    const result = await useCase.execute('r1', { name: 'Super Editor' });

    expect(result.name).toBe('Super Editor');
    expect(mockRepo.update).toHaveBeenCalledWith('r1', {
      name: 'Super Editor',
    });
  });

  it('throws roleNotFound RbacException when the id does not match', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', { name: 'x' }),
    ).rejects.toMatchObject({
      constructor: RbacException,
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'rbac.errors.role_not_found',
      details: { id: 'missing' },
    });
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
