import { AppErrorCode } from '#src/core/index.js';
import { Role } from '../../domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { buildRoleRepoMock } from './__test-support__/repository-mocks.js';
import { GetRoleByIdUseCase } from './get-role-by-id.use-case.js';
import type { jest } from '@jest/globals';

describe('GetRoleByIdUseCase', () => {
  let useCase: GetRoleByIdUseCase;
  let mockRepo: jest.Mocked<RoleRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildRoleRepoMock();
    useCase = new GetRoleByIdUseCase(mockRepo);
  });

  it('returns the role when it exists', async () => {
    const role = new Role(
      'r1',
      'Admin',
      'admin',
      null,
      true,
      new Date(),
      new Date(),
    );
    mockRepo.findById.mockResolvedValue(role);

    const result = await useCase.execute('r1');

    expect(result).toBe(role);
    expect(mockRepo.findById).toHaveBeenCalledWith('r1');
  });

  it('throws roleNotFound RbacException when the id does not match', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toMatchObject({
      constructor: RbacException,
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'rbac.errors.role_not_found',
      details: { id: 'missing' },
    });
  });
});
