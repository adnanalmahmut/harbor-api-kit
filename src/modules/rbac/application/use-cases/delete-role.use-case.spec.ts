import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { DeleteRoleUseCase } from './delete-role.use-case.js';
import { jest } from '@jest/globals';

describe('DeleteRoleUseCase', () => {
  let useCase: DeleteRoleUseCase;
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
    useCase = new DeleteRoleUseCase(mockRepo);
  });

  it('delegates to the repository to delete by id', async () => {
    mockRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('r1');

    expect(mockRepo.delete).toHaveBeenCalledWith('r1');
  });
});
