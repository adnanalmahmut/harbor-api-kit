import type { GrantsRepositoryPort } from '#src/modules/rbac/index.js';
import { buildGrantsRepoMock } from './__test-support__/repository-mocks.js';
import { GetUserPermissionsUseCase } from './get-user-permissions.use-case.js';
import type { jest } from '@jest/globals';

describe('GetUserPermissionsUseCase', () => {
  let useCase: GetUserPermissionsUseCase;
  let mockRepo: jest.Mocked<GrantsRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildGrantsRepoMock();
    useCase = new GetUserPermissionsUseCase(mockRepo);
  });

  it('returns the allow/deny override lists for the user', async () => {
    const overrides: any = { allow: [{ key: 'posts:read' }], deny: [] };
    mockRepo.listUserOverrides.mockResolvedValue(overrides);

    const result = await useCase.execute('u1');

    expect(result).toBe(overrides);
    expect(mockRepo.listUserOverrides).toHaveBeenCalledWith('u1');
  });

  it('returns empty lists when the user has no overrides', async () => {
    mockRepo.listUserOverrides.mockResolvedValue({ allow: [], deny: [] });

    const result = await useCase.execute('u1');

    expect(result).toEqual({ allow: [], deny: [] });
  });
});
