import type { CacheManagerPort } from '#src/core/ports/cache-manager.port.js';
import type { LoggerPort } from '#src/core/ports/logger.port.js';
import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '#src/modules/rbac/domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { PermissionKeyVO } from '#src/modules/rbac/domain/value-objects/permission-key.vo.js';
import { UserPermissionOverride } from '#src/modules/rbac/domain/value-objects/user-permission-override.vo.js';
import { jest } from '@jest/globals';

describe('EffectivePermissionsService', () => {
  let service: EffectivePermissionsService;
  let mockRoleRepo: jest.Mocked<RoleRepositoryPort>;
  let mockGrantsRepo: jest.Mocked<GrantsRepositoryPort>;
  let mockCache: jest.Mocked<CacheManagerPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  beforeEach(() => {
    mockRoleRepo = {
      listUserRoleIds: jest.fn<() => Promise<string[]>>(),
      listRolesForUser: jest.fn<() => Promise<never[]>>().mockResolvedValue([]),
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      assignRoleToUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      removeRoleFromUser: jest.fn(),
      replaceUserRoles: jest.fn(),
    } as unknown as jest.Mocked<RoleRepositoryPort>;

    mockGrantsRepo = {
      listPermissionsForRoleIds: jest.fn<() => Promise<Permission[]>>(),
      listUserOverrides: jest.fn(),
    } as unknown as jest.Mocked<GrantsRepositoryPort>;

    mockCache = {
      get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
      set: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      del: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheManagerPort>;

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    service = new EffectivePermissionsService(
      mockRoleRepo,
      mockGrantsRepo,
      mockCache,
      mockLogger,
    );
  });

  it('should build permissions correctly', async () => {
    const userId = 'u1';
    mockRoleRepo.listUserRoleIds.mockResolvedValue(['r1']);
    mockGrantsRepo.listPermissionsForRoleIds.mockResolvedValue([
      {
        key: PermissionKeyVO.fromParts('posts', 'read'),
      } as unknown as Permission,
    ]);
    mockGrantsRepo.listUserOverrides.mockResolvedValue({
      allow: [
        new UserPermissionOverride(
          PermissionKeyVO.fromParts('posts', 'write'),
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
