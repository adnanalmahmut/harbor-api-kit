import { Role } from '../../domain/entities/role.entity.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { buildRoleRepoMock } from './__test-support__/repository-mocks.js';
import { CreateRoleUseCase } from './create-role.use-case.js';
import type { jest } from '@jest/globals';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let mockRepo: jest.Mocked<RoleRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildRoleRepoMock();
    useCase = new CreateRoleUseCase(mockRepo);
  });

  it('creates a role with the given fields', async () => {
    mockRepo.create.mockImplementation((r) => Promise.resolve(r));

    const result = await useCase.execute({
      name: 'Editor',
      slug: 'editor',
      description: 'Editor role',
      isSystem: false,
    });

    expect(result).toBeInstanceOf(Role);
    expect(result.name).toBe('Editor');
    expect(result.slug).toBe('editor');
    expect(result.description).toBe('Editor role');
    expect(result.isSystem).toBe(false);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.any(Role));
  });

  it('defaults isSystem to false and description to null when omitted', async () => {
    mockRepo.create.mockImplementation((r) => Promise.resolve(r));

    const result = await useCase.execute({ name: 'Viewer', slug: 'viewer' });

    expect(result.isSystem).toBe(false);
    expect(result.description).toBeNull();
  });
});
