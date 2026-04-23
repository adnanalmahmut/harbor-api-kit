import type { EffectivePermissionsService } from '#src/modules/rbac/index.js';
import {
  buildEffectivePermissionsMock,
  type EffectivePermissionsMock,
} from './__test-support__/repository-mocks.js';
import { GetUserEffectivePermissionsUseCase } from './get-user-effective-permissions.use-case.js';

describe('GetUserEffectivePermissionsUseCase', () => {
  let useCase: GetUserEffectivePermissionsUseCase;
  let mockEffective: EffectivePermissionsMock;

  beforeEach(() => {
    mockEffective = buildEffectivePermissionsMock();
    useCase = new GetUserEffectivePermissionsUseCase(
      mockEffective as unknown as EffectivePermissionsService,
    );
  });

  it('flattens role/permission sets into arrays for the response', async () => {
    mockEffective.buildForUser.mockResolvedValue({
      roles: new Set(['admin']),
      permissions: new Set(['posts:read', 'posts:write']),
      deny: new Set(),
      has: () => false,
    });

    const result = await useCase.execute('u1');

    expect(mockEffective.buildForUser).toHaveBeenCalledWith({ id: 'u1' });
    expect(result.roles).toEqual(['admin']);
    expect(result.permissions.sort()).toEqual(
      ['posts:read', 'posts:write'].sort(),
    );
  });

  it('returns empty arrays for a user with no grants', async () => {
    mockEffective.buildForUser.mockResolvedValue({
      roles: new Set(),
      permissions: new Set(),
      deny: new Set(),
      has: () => false,
    });

    const result = await useCase.execute('u1');

    expect(result.roles).toEqual([]);
    expect(result.permissions).toEqual([]);
  });
});
