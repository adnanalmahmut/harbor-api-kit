import { AppErrorCode } from '#src/core/index.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { User } from '../../domain/entities/user.entity.js';
import { UsersException } from '../exceptions/users.exception.js';
import { buildUserRepoMock } from './__test-support__/repository-mocks.js';
import { UpdateUserByIdUseCase } from './update-user-by-id.use-case.js';
import type { jest } from '@jest/globals';

describe('UpdateUserByIdUseCase', () => {
  let useCase: UpdateUserByIdUseCase;
  let mockRepo: jest.Mocked<UserRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildUserRepoMock();
    useCase = new UpdateUserByIdUseCase(mockRepo);
  });

  it('applies only the fields present on the command', async () => {
    const existing = new User(
      'u1',
      'Full',
      'Old',
      'Name',
      'old@example.com',
      true,
      '',
      'en-US',
      [],
      [],
      new Date(),
      new Date(),
    );
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.update.mockImplementation((u) => Promise.resolve(u));

    const result = await useCase.execute({
      userId: 'u1',
      firstName: 'New',
    });

    expect(result.firstName).toBe('New');
    expect(result.lastName).toBe('Name');
    expect(result.email).toBe('old@example.com');
    expect(mockRepo.update).toHaveBeenCalledWith(existing);
  });

  it('throws userNotFound UsersException when the user is missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'missing', firstName: 'x' }),
    ).rejects.toMatchObject({
      constructor: UsersException,
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'users.errors.user_not_found',
      details: { userId: 'missing' },
    });
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
