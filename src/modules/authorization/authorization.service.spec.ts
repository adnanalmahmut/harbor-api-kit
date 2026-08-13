import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthorizationRepository } from './authorization.repository.js';
import { AuthorizationService } from './authorization.service.js';
import { EffectivePermissionsService } from './effective-permissions.service.js';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let repository: jest.Mocked<AuthorizationRepository>;
  let effective: { buildForUser: jest.Mock; refreshForUser: jest.Mock };

  beforeEach(async () => {
    repository = {
      getUserRole: jest.fn(),
      listUserOverrides: jest.fn(),
      setUserPermissionOverride: jest.fn(),
      removeUserPermissionOverride: jest.fn(),
      replaceUserPermissions: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationRepository>;

    effective = { buildForUser: jest.fn(), refreshForUser: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: AuthorizationRepository, useValue: repository },
        { provide: EffectivePermissionsService, useValue: effective },
      ],
    }).compile();

    service = moduleRef.get(AuthorizationService);
  });

  it('returns the stored overrides', async () => {
    const overrides = { allow: [], deny: [] };
    repository.listUserOverrides.mockResolvedValue(overrides);

    await expect(service.listOverrides('u1')).resolves.toBe(overrides);
    expect(repository.listUserOverrides).toHaveBeenCalledWith('u1');
  });

  it('stores an override and invalidates the cached permissions', async () => {
    await service.setOverride({
      userId: 'u1',
      permissionKey: 'files:delete',
      effect: 'DENY',
      note: 'temporary',
    });

    expect(repository.setUserPermissionOverride).toHaveBeenCalledWith('u1', {
      permissionKey: 'files:delete',
      effect: 'DENY',
      note: 'temporary',
    });
    expect(effective.refreshForUser).toHaveBeenCalledWith('u1');
  });

  it('removes an override and invalidates the cached permissions', async () => {
    await service.removeOverride({
      userId: 'u1',
      permissionKey: 'files:delete',
    });

    expect(repository.removeUserPermissionOverride).toHaveBeenCalledWith(
      'u1',
      'files:delete',
    );
    expect(effective.refreshForUser).toHaveBeenCalledWith('u1');
  });

  it('replaces every override and invalidates the cached permissions', async () => {
    const overrides = [
      { permissionKey: 'files:create', effect: 'ALLOW' as const },
      { permissionKey: 'files:delete', effect: 'DENY' as const },
    ];

    await service.replaceOverrides('u1', overrides);

    expect(repository.replaceUserPermissions).toHaveBeenCalledWith(
      'u1',
      overrides,
    );
    expect(effective.refreshForUser).toHaveBeenCalledWith('u1');
  });

  it('flattens the effective permission sets into arrays', async () => {
    effective.buildForUser.mockResolvedValue({
      roles: new Set(['admin']),
      permissions: new Set(['posts:read', 'posts:write']),
      deny: new Set(),
      has: () => false,
    } as never);

    const result = await service.getEffectivePermissions('u1');

    expect(effective.buildForUser).toHaveBeenCalledWith({ id: 'u1' });
    expect(result.roles).toEqual(['admin']);
    expect(result.permissions.sort()).toEqual(['posts:read', 'posts:write']);
  });

  it('returns empty arrays for a user with no grants', async () => {
    effective.buildForUser.mockResolvedValue({
      roles: new Set(),
      permissions: new Set(),
      deny: new Set(),
      has: () => false,
    } as never);

    const result = await service.getEffectivePermissions('u1');

    expect(result.roles).toEqual([]);
    expect(result.permissions).toEqual([]);
  });
});
