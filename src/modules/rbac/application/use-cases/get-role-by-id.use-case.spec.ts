import { Role } from '../../domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { GetRoleByIdUseCase } from './get-role-by-id.use-case.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { jest } from '@jest/globals';

describe('GetRoleByIdUseCase', () => {
  let useCase: GetRoleByIdUseCase;
  let mockRepo: jest.Mocked<RoleRepositoryPort>;

  beforeEach(() => {
    mockRepo = {
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

  it('throws RbacException when the role is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      RbacException,
    );
  });
});
