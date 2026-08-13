import { CachePort } from '#src/infrastructure/cache/cache.port.js';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { authorizationCacheKeys } from './authorization.cache-keys.js';
import { AuthorizationRepository } from './authorization.repository.js';
import { EffectivePermissionsService } from './effective-permissions.service.js';
import { PermissionKeyVO } from './permission-key.vo.js';
import { UserPermissionOverride } from './user-permission-override.js';

describe('EffectivePermissionsService', () => {
  let service: EffectivePermissionsService;
  let repository: jest.Mocked<AuthorizationRepository>;
  let cache: jest.Mocked<CachePort>;
  let logger: { warn: jest.Mock; setContext: jest.Mock };

  beforeEach(async () => {
    repository = {
      getUserRole: jest.fn<AuthorizationRepository['getUserRole']>(),
      listUserOverrides:
        jest.fn<AuthorizationRepository['listUserOverrides']>(),
      setUserPermissionOverride: jest.fn(),
      removeUserPermissionOverride: jest.fn(),
      replaceUserPermissions: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationRepository>;
    repository.getUserRole.mockResolvedValue('user');
    repository.listUserOverrides.mockResolvedValue({ allow: [], deny: [] });

    cache = {
      get: jest.fn<CachePort['get']>().mockResolvedValue(null),
      set: jest.fn<CachePort['set']>().mockResolvedValue('OK'),
      del: jest.fn<CachePort['del']>().mockResolvedValue(1),
      incr: jest.fn<CachePort['incr']>().mockResolvedValue(1),
    } as unknown as jest.Mocked<CachePort>;

    logger = { warn: jest.fn(), setContext: jest.fn() };

    // No request context is open, so `getOrLoad`'s request tier is inert and
    // every call reaches the loader — which is what these cases exercise.
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EffectivePermissionsService,
        { provide: AuthorizationRepository, useValue: repository },
        { provide: CachePort, useValue: cache },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    service = moduleRef.get(EffectivePermissionsService);
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
    cache.get.mockImplementation((key: string) => {
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
