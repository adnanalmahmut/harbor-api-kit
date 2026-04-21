import type {
  CacheManagerPort,
  LoggerPort,
  RequestContextStorePort,
} from '#src/core/index.js';
import { EffectivePermissionsService } from './effective-permissions.service.js';
import { Permission } from '../../domain/entities/permission.entity.js';
import type { GrantsRepositoryPort } from '../../domain/ports/grants.repository.port.js';
import type { RoleRepositoryPort } from '../../domain/ports/role.repository.port.js';
import { PermissionKeyVO } from '../../domain/value-objects/permission-key.vo.js';
import { UserPermissionOverride } from '../../domain/value-objects/user-permission-override.vo.js';
import { jest } from '@jest/globals';

describe('EffectivePermissionsService', () => {
  let service: EffectivePermissionsService;
  let mockRoleRepo: jest.Mocked<RoleRepositoryPort>;
  let mockGrantsRepo: jest.Mocked<GrantsRepositoryPort>;
  let mockCache: jest.Mocked<CacheManagerPort>;
  let mockLogger: jest.Mocked<LoggerPort>;
  let mockContextStore: jest.Mocked<RequestContextStorePort>;

  beforeEach(() => {
    mockRoleRepo = {
      listUserRoleIds: jest.fn<() => Promise<string[]>>(),
      listRolesForUser: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
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
      set: jest.fn<() => Promise<any>>().mockResolvedValue('OK'),
      del: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      incr: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    } as unknown as jest.Mocked<CacheManagerPort>;

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    mockContextStore = {
      get: jest.fn(),
      set: jest.fn(),
      getOrLoad: jest
        .fn<any>()
        .mockImplementation((_key: string, loader: () => Promise<any>) =>
          loader(),
        ),
    } as unknown as jest.Mocked<RequestContextStorePort>;

    service = new EffectivePermissionsService(
      mockRoleRepo,
      mockGrantsRepo,
      mockCache,
      mockLogger,
      mockContextStore,
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

    const perms = await service.buildForUser({ id: userId });

    expect(perms.has('posts:read')).toBe(true);
    expect(perms.has('posts:write')).toBe(true);
    expect(perms.has('posts:delete')).toBe(false);
  });

  describe('cache behaviour', () => {
    const userId = 'u1';
    const versionedKey = `rbac:user:${userId}:permissions:0:0`;

    function mockCacheReturn(key: string, value: string | null) {
      mockCache.get.mockImplementation((k: string) =>
        Promise.resolve(k === key ? value : null),
      );
    }

    it('returns hydrated permissions from cache on HIT without touching DB', async () => {
      mockCacheReturn(
        versionedKey,
        JSON.stringify({
          roles: ['admin'],
          permissions: ['posts:read'],
          deny: [],
        }),
      );

      const perms = await service.buildForUser({ id: userId });

      expect(perms.roles.has('admin')).toBe(true);
      expect(perms.has('posts:read')).toBe(true);
      expect(mockRoleRepo.listUserRoleIds).not.toHaveBeenCalled();
      expect(mockGrantsRepo.listPermissionsForRoleIds).not.toHaveBeenCalled();
      expect(mockGrantsRepo.listUserOverrides).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('falls through to DB and logs a warning when cached JSON is corrupt', async () => {
      mockCacheReturn(versionedKey, '{not-valid-json');
      mockRoleRepo.listUserRoleIds.mockResolvedValue([]);
      mockGrantsRepo.listPermissionsForRoleIds.mockResolvedValue([]);
      mockGrantsRepo.listUserOverrides.mockResolvedValue({
        allow: [],
        deny: [],
      });

      const perms = await service.buildForUser({ id: userId });

      expect(perms.permissions.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CORRUPTION'),
      );
      expect(mockRoleRepo.listUserRoleIds).toHaveBeenCalledWith(userId);
    });

    it('falls through to DB and logs a warning when cached shape is invalid', async () => {
      mockCacheReturn(
        versionedKey,
        JSON.stringify({ roles: ['admin'], permissions: 'not-an-array' }),
      );
      mockRoleRepo.listUserRoleIds.mockResolvedValue([]);
      mockGrantsRepo.listPermissionsForRoleIds.mockResolvedValue([]);
      mockGrantsRepo.listUserOverrides.mockResolvedValue({
        allow: [],
        deny: [],
      });

      const perms = await service.buildForUser({ id: userId });

      expect(perms.permissions.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CORRUPTION'),
      );
      expect(mockRoleRepo.listUserRoleIds).toHaveBeenCalledWith(userId);
    });
  });
});
