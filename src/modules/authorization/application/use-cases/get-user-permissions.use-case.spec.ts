import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';
import { buildAuthorizationRepoMock } from './__test-support__/repository-mocks.js';
import { GetUserPermissionsUseCase } from './get-user-permissions.use-case.js';
import type { jest } from '@jest/globals';

describe('GetUserPermissionsUseCase', () => {
  let useCase: GetUserPermissionsUseCase;
  let repository: jest.Mocked<AuthorizationRepositoryPort>;

  beforeEach(() => {
    repository = buildAuthorizationRepoMock();
    useCase = new GetUserPermissionsUseCase(repository);
  });

  it('returns the user permission overrides', async () => {
    const overrides = { allow: [], deny: [] };
    repository.listUserOverrides.mockResolvedValue(overrides);

    await expect(useCase.execute('u1')).resolves.toBe(overrides);
    expect(repository.listUserOverrides).toHaveBeenCalledWith('u1');
  });
});
