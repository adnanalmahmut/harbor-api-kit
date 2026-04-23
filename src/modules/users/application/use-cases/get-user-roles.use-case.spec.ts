import type { RoleRepositoryPort } from '#src/modules/rbac/index.js';
import { buildRoleRepoMock } from './__test-support__/repository-mocks.js';
import { GetUserRolesUseCase } from './get-user-roles.use-case.js';
import type { jest } from '@jest/globals';

describe('GetUserRolesUseCase', () => {
  let useCase: GetUserRolesUseCase;
  let mockRepo: jest.Mocked<RoleRepositoryPort>;

  beforeEach(() => {
    mockRepo = buildRoleRepoMock();
    useCase = new GetUserRolesUseCase(mockRepo);
  });

  it('returns the roles assigned to the user', async () => {
    const roles: any[] = [{ id: 'r1', slug: 'admin' }];
    mockRepo.listRolesForUser.mockResolvedValue(roles);

    const result = await useCase.execute('u1');

    expect(result).toBe(roles);
    expect(mockRepo.listRolesForUser).toHaveBeenCalledWith('u1');
  });

  it('returns an empty array when the user has no roles', async () => {
    mockRepo.listRolesForUser.mockResolvedValue([]);

    const result = await useCase.execute('u1');

    expect(result).toEqual([]);
  });
});
