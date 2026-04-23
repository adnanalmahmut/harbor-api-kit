import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { User } from '../../domain/entities/user.entity.js';
import { buildUserRepoMock } from './__test-support__/repository-mocks.js';
import { GetUserByIdUseCase } from './get-users.use-case.js';
import type { jest } from '@jest/globals';

describe('GetUserByIdUseCase', () => {
  let useCase: GetUserByIdUseCase;
  let mockRepo: jest.Mocked<UserRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildUserRepoMock();
    useCase = new GetUserByIdUseCase(mockRepo);
  });

  it('returns the user when found', async () => {
    const user = new User(
      'u1',
      'Full Name',
      'Full',
      'Name',
      'a@b.com',
      true,
      '',
      'en-US',
      [],
      [],
      new Date(),
      new Date(),
    );
    mockRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute('u1');

    expect(result).toBe(user);
    expect(mockRepo.findById).toHaveBeenCalledWith('u1');
  });

  it('returns null when the user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute('missing');

    expect(result).toBeNull();
  });
});
