import { Role } from '../../domain/entities/role.entity.js';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { ReplaceRolePermissionsUseCase } from './replace-role-permissions.use-case.js';
import { jest } from '@jest/globals';

describe('ReplaceRolePermissionsUseCase', () => {
  let useCase: ReplaceRolePermissionsUseCase;
  let mockRoleRepo: jest.Mocked<RoleRepositoryPort>;
  let mockGrantsRepo: jest.Mocked<GrantsRepositoryPort>;

  beforeEach(() => {
    mockRoleRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      listUserRoleIds: jest.fn(),
      listRolesForUser: jest.fn(),
      assignRoleToUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      removeRoleFromUser: jest.fn(),
      replaceUserRoles: jest.fn(),
    } as unknown as jest.Mocked<RoleRepositoryPort>;

    mockGrantsRepo = {
      listPermissionsForRoleIds: jest.fn(),
      listUserOverrides: jest.fn(),
      assignPermissionToRole: jest.fn(),
      removePermissionFromRole: jest.fn(),
      setUserPermissionOverride: jest.fn(),
      removeUserPermissionOverride: jest.fn(),
      replaceRolePermissions: jest.fn(),
      replaceUserPermissions: jest.fn(),
    } as unknown as jest.Mocked<GrantsRepositoryPort>;

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

  it('throws RbacException and does not touch grants when the role is missing', async () => {
    mockRoleRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', ['p1'])).rejects.toBeInstanceOf(
      RbacException,
    );
    expect(mockGrantsRepo.replaceRolePermissions).not.toHaveBeenCalled();
  });
});
