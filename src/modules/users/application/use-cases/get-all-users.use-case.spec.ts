import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { User } from '../../domain/entities/user.entity.js';
import { buildUserRepoMock } from './__test-support__/repository-mocks.js';
import { GetAllUsersUseCase } from './get-all-users.use-case.js';
import type { jest } from '@jest/globals';

describe('GetAllUsersUseCase', () => {
  let useCase: GetAllUsersUseCase;
  let mockRepo: jest.Mocked<UserRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildUserRepoMock();
    useCase = new GetAllUsersUseCase(mockRepo);
  });

  it('returns the full list from the repository', async () => {
    const users = [
      new User(
        'u1',
        'n1',
        null,
        'a@b.com',
        true,
        '',
        'en-US',
        [],
        [],
        new Date(),
        new Date(),
      ),
    ];
    mockRepo.findAll.mockResolvedValue(users);

    const result = await useCase.execute();

    expect(result).toBe(users);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('returns null when the repository has no data', async () => {
    mockRepo.findAll.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toBeNull();
  });
});
