import { AppErrorCode } from '#src/core/index.js';
import { Role } from '../../domain/entities/role.entity.js';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import {
  buildGrantsRepoMock,
  buildRoleRepoMock,
} from './__test-support__/repository-mocks.js';
import { ReplaceRolePermissionsUseCase } from './replace-role-permissions.use-case.js';
import type { jest } from '@jest/globals';

describe('ReplaceRolePermissionsUseCase', () => {
  let useCase: ReplaceRolePermissionsUseCase;
  let mockRoleRepo: jest.Mocked<RoleRepositoryPort>;
  let mockGrantsRepo: jest.Mocked<GrantsRepositoryPort>;

  beforeEach(() => {
    mockRoleRepo = buildRoleRepoMock();
    mockGrantsRepo = buildGrantsRepoMock();
    useCase = new ReplaceRolePermissionsUseCase(mockRoleRepo, mockGrantsRepo);
  });

  it('replaces permissions when the role exists', async () => {
    const role = new Role(
      'r1',
      'Admin',
      'admin',
      null,
      true,
      new Date(),
      new Date(),
    );
    mockRoleRepo.findById.mockResolvedValue(role);
    mockGrantsRepo.replaceRolePermissions.mockResolvedValue(undefined);

    await useCase.execute('r1', ['p1', 'p2']);

    expect(mockGrantsRepo.replaceRolePermissions).toHaveBeenCalledWith('r1', [
      'p1',
      'p2',
    ]);
  });

  it('throws roleNotFound RbacException and does not touch grants when the role is missing', async () => {
    mockRoleRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', ['p1'])).rejects.toMatchObject({
      constructor: RbacException,
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'rbac.errors.role_not_found',
      details: { id: 'missing' },
    });
    expect(mockGrantsRepo.replaceRolePermissions).not.toHaveBeenCalled();
  });
});
