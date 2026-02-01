import { AppException } from '#src/core/exceptions/app-exception.js';
import { CreateUserUseCase } from '#src/modules/users/application/use-cases/create-user.use-case.js';
import { User } from '#src/modules/users/domain/entities/user.entity.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepo: UserRepositoryPort;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };
    useCase = new CreateUserUseCase(mockUserRepo);
  });

  it('should create a user successfully', async () => {
    const command = { email: 'test@example.com', name: 'Test User' };
    (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null);
    (mockUserRepo.create as jest.Mock).mockImplementation((u) =>
      Promise.resolve(u),
    );

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe(command.email);
    expect(mockUserRepo.create).toHaveBeenCalled();
  });

  it('should throw if user exists', async () => {
    const command = { email: 'test@example.com', name: 'Test User' };
    (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue({
      id: '1',
    } as User);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(AppException);
  });
});
