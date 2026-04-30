import { Permission } from '../../domain/entities/permission.entity.js';
import type { PermissionRepositoryPort } from '../../domain/ports/permission.repository.port.js';
import { buildPermissionRepoMock } from './__test-support__/repository-mocks.js';
import { CreatePermissionUseCase } from './create-permission.use-case.js';
import type { jest } from '@jest/globals';

describe('CreatePermissionUseCase', () => {
  let useCase: CreatePermissionUseCase;
  let mockRepo: jest.Mocked<PermissionRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildPermissionRepoMock();
    useCase = new CreatePermissionUseCase(mockRepo);
  });

  it('creates a new permission with the given action/subject', async () => {
    mockRepo.create.mockImplementation((p) => Promise.resolve(p));

    const result = await useCase.execute({
      action: 'read',
      subject: 'posts',
      description: 'Read posts',
    });

    expect(result).toBeInstanceOf(Permission);
    expect(result.action).toBe('read');
    expect(result.subject).toBe('posts');
    expect(result.description).toBe('Read posts');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.any(Permission));
  });

  it('defaults description to null when not provided', async () => {
    mockRepo.create.mockImplementation((p) => Promise.resolve(p));

    const result = await useCase.execute({ action: 'write', subject: 'posts' });

    expect(result.description).toBeNull();
  });
});
