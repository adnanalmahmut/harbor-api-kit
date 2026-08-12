import type {
  CacheManagerPort,
  LoggerPort,
  RequestContextStorePort,
} from '#src/core/index.js';
import { authorizationCacheKeys } from '../authorization.cache-keys.js';
import { EffectivePermissionsService } from './effective-permissions.service.js';
import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';
import { PermissionKeyVO } from '../../domain/value-objects/permission-key.vo.js';
import { UserPermissionOverride } from '../../domain/value-objects/user-permission-override.vo.js';
import { jest } from '@jest/globals';

describe('EffectivePermissionsService', () => {
  let service: EffectivePermissionsService;
  let repository: jest.Mocked<AuthorizationRepositoryPort>;
  let cache: jest.Mocked<CacheManagerPort>;
  let logger: jest.Mocked<LoggerPort>;

  beforeEach(() => {
    repository = {
      getUserRole: jest.fn().mockResolvedValue('user'),
      listUserOverrides: jest.fn().mockResolvedValue({ allow: [], deny: [] }),
      setUserPermissionOverride: jest.fn(),
      removeUserPermissionOverride: jest.fn(),
      replaceUserPermissions: jest.fn(),
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
    };
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    const contextStore = {
      get: jest.fn(),
      set: jest.fn(),
      run: jest.fn(),
      getOrLoad: jest
        .fn()
        .mockImplementation((_key: string, loader: () => Promise<unknown>) =>
          loader(),
        ),
    } as unknown as jest.Mocked<RequestContextStorePort>;

    service = new EffectivePermissionsService(
      repository,
      cache,
      logger,
      contextStore,
    );
  });

  it('inherits static permissions from the stored role', async () => {
    const result = await service.buildForUser({ id: 'u1' });

    expect(result.roles).toEqual(new Set(['user']));
    expect(result.has('files:create')).toBe(true);
    expect(result.has('files:delete')).toBe(false);
  });

  it('adds ALLOW overrides and gives DENY overrides precedence', async () => {
    repository.listUserOverrides.mockResolvedValue({
      allow: [
        new UserPermissionOverride(
          PermissionKeyVO.parse('files:delete'),
          'ALLOW',
        ),
      ],
      deny: [
        new UserPermissionOverride(
          PermissionKeyVO.parse('files:create'),
          'DENY',
        ),
      ],
    });

    const result = await service.buildForUser({ id: 'u1' });

    expect(result.has('files:delete')).toBe(true);
    expect(result.has('files:create')).toBe(false);
  });

  it('honors an explicit deny even when the role grants manage', async () => {
    repository.getUserRole.mockResolvedValue('admin');
    repository.listUserOverrides.mockResolvedValue({
      allow: [],
      deny: [
        new UserPermissionOverride(
          PermissionKeyVO.parse('files:delete'),
          'DENY',
        ),
      ],
    });

    const result = await service.buildForUser({ id: 'u1' });

    expect(result.has('files:update')).toBe(true);
    expect(result.has('files:delete')).toBe(false);
  });

  it('uses a valid cached authorization snapshot without repository reads', async () => {
    cache.get.mockImplementation((key) => {
      if (key === authorizationCacheKeys.userVersion('u1')) {
        return Promise.resolve('3');
      }
      if (key === authorizationCacheKeys.effectivePermissions('u1', '3')) {
        return Promise.resolve(
          JSON.stringify({
            roles: ['admin'],
            permissions: ['files:manage'],
            deny: ['files:delete'],
          }),
        );
      }
      return Promise.resolve(null);
    });

    const result = await service.buildForUser({ id: 'u1' });

    expect(result.has('files:update')).toBe(true);
    expect(result.has('files:delete')).toBe(false);
    expect(repository.getUserRole).not.toHaveBeenCalled();
  });

  it('fails closed for unknown stored roles and logs the condition', async () => {
    repository.getUserRole.mockResolvedValue('retired-role');

    const result = await service.buildForUser({ id: 'u1' });

    expect(result.permissions.size).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('authorization.role.unknown'),
    );
  });
});
