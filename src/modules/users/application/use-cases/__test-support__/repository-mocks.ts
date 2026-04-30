// Test-only helpers. Not referenced from production code.
// UserRepositoryPort is owned by this module; the RBAC port mocks below
// mirror the rbac module's own __test-support__ helpers intentionally —
// cross-module deep imports are forbidden, so a small duplication is
// preferred over a shared test-support barrel.
import type { AuthProviderPort } from '#src/modules/auth/index.js';
import type {
  EffectivePermissionsService,
  GrantsRepositoryPort,
  RoleRepositoryPort,
} from '#src/modules/rbac/index.js';
import type { UserRepositoryPort } from '../../../domain/ports/user.repository.port.js';
import { jest } from '@jest/globals';

export function buildUserRepoMock(): jest.Mocked<UserRepositoryPort> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<UserRepositoryPort>;
}

export function buildRoleRepoMock(): jest.Mocked<RoleRepositoryPort> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    listUserRoleIds: jest.fn(),
    listRolesForUser: jest.fn(),
    assignRoleToUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    removeRoleFromUser: jest.fn(),
    replaceUserRoles: jest.fn(),
  } as unknown as jest.Mocked<RoleRepositoryPort>;
}

export function buildGrantsRepoMock(): jest.Mocked<GrantsRepositoryPort> {
  return {
    listPermissionsForRoleIds: jest.fn(),
    listUserOverrides: jest.fn(),
    assignPermissionToRole: jest.fn(),
    removePermissionFromRole: jest.fn(),
    setUserPermissionOverride: jest.fn(),
    removeUserPermissionOverride: jest.fn(),
    replaceRolePermissions: jest.fn(),
    replaceUserPermissions: jest.fn(),
  } as unknown as jest.Mocked<GrantsRepositoryPort>;
}

export function buildAuthProviderMock(): jest.Mocked<AuthProviderPort> {
  // User use-cases only touch invalidateUserSessions. Other methods are
  // stubbed with jest.fn() to satisfy the interface shape; tests that rely
  // on them should assert on the specific mock call.
  return {
    invalidateUserSessions: jest.fn(),
    invalidateAllSessions: jest.fn(),
  } as unknown as jest.Mocked<AuthProviderPort>;
}

export type EffectivePermissionsMock = Pick<
  jest.Mocked<EffectivePermissionsService>,
  'buildForUser' | 'refreshForUser' | 'invalidateForUser' | 'invalidateAll'
>;

export function buildEffectivePermissionsMock(): EffectivePermissionsMock {
  return {
    buildForUser: jest.fn(),
    refreshForUser: jest.fn(),
    invalidateForUser: jest.fn(),
    invalidateAll: jest.fn(),
  } as unknown as EffectivePermissionsMock;
}
