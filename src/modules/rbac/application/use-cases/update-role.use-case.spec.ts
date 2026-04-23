import { Role } from '../../domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { RbacException } from '../exceptions/rbac.exception.js';
import { UpdateRoleUseCase } from './update-role.use-case.js';
import { jest } from '@jest/globals';

describe('UpdateRoleUseCase', () => {
  let useCase: UpdateRoleUseCase;
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

  it('throws RbacException when the role is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(RbacException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
