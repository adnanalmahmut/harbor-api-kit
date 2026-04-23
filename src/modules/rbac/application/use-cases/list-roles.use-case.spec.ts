import { Role } from '../../domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { ListRolesUseCase } from './list-roles.use-case.js';
import { jest } from '@jest/globals';

describe('ListRolesUseCase', () => {
  let useCase: ListRolesUseCase;
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
    useCase = new ListRolesUseCase(mockRepo);
  });

  it('returns the full list from the repository', async () => {
    const roles = [
      new Role('r1', 'Admin', 'admin', null, true, new Date(), new Date()),
      new Role('r2', 'Editor', 'editor', null, false, new Date(), new Date()),
    ];
    mockRepo.findAll.mockResolvedValue(roles);

    const result = await useCase.execute();

    expect(result).toEqual(roles);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('returns an empty array when there are no roles', async () => {
    mockRepo.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
