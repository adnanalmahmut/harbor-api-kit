import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { PermissionKeyVO } from '#src/modules/rbac/domain/value-objects/permission-key.vo.js';
import { UserPermissionOverride } from '#src/modules/rbac/domain/value-objects/user-permission-override.vo.js';

describe('EffectivePermissionsService', () => {
  let service: EffectivePermissionsService;
  let mockRoleRepo: RoleRepositoryPort;
  let mockGrantsRepo: GrantsRepositoryPort;

  beforeEach(() => {
    mockRoleRepo = {
      listUserRoleIds: jest.fn(),
    } as any;
    mockGrantsRepo = {
      listPermissionsForRoleIds: jest.fn(),
      listUserOverrides: jest.fn(),
    } as any;
    service = new EffectivePermissionsService(mockRoleRepo, mockGrantsRepo);
  });

  it('should build permissions correctly', async () => {
    const userId = 'u1';
    (mockRoleRepo.listUserRoleIds as jest.Mock).mockResolvedValue(['r1']);
    (mockGrantsRepo.listPermissionsForRoleIds as jest.Mock).mockResolvedValue([
      {
        key: PermissionKeyVO.fromParts('read', 'posts'),
      } as unknown as Permission,
    ]);
    (mockGrantsRepo.listUserOverrides as jest.Mock).mockResolvedValue({
      allow: [
        new UserPermissionOverride(
          PermissionKeyVO.fromParts('write', 'posts'),
          'ALLOW',
        ),
      ],
      deny: [],
    });

    const perms = await service.buildForUser(userId);

    expect(perms.has('posts:read')).toBe(true);
    expect(perms.has('posts:write')).toBe(true);
    expect(perms.has('posts:delete')).toBe(false);
  });
});
