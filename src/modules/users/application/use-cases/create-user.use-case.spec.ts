import { AppException } from '#src/core/index.js';
import { CreateUserUseCase } from './create-user.use-case.js';
import { User } from '../../domain/entities/user.entity.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { jest } from '@jest/globals';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepo: jest.Mocked<UserRepositoryPort>;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserRepositoryPort>;
    useCase = new CreateUserUseCase(mockUserRepo);
  });

  it('should create a user successfully', async () => {
    const command = { email: 'test@example.com', name: 'Test User' };
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.create.mockImplementation((u) => Promise.resolve(u));

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe(command.email);
    expect(mockUserRepo.create).toHaveBeenCalled();
  });

  it('should throw if user exists', async () => {
    const command = { email: 'test@example.com', name: 'Test User' };
    mockUserRepo.findByEmail.mockResolvedValue({
      id: '1',
    } as User);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(AppException);
  });
});
