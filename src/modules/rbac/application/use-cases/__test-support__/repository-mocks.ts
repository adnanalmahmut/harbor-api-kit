// Test-only helpers. Not referenced from production code.
// Keep each builder in sync with its port interface so a new method on
// the port produces a compiler error here, forcing specs to cover it.
import type { GrantsRepositoryPort } from '../../../domain/ports/grants.repository.port.js';
import type { PermissionRepositoryPort } from '../../../domain/ports/permission.repository.port.js';
import type { RoleRepositoryPort } from '../../../domain/ports/role.repository.port.js';
import { jest } from '@jest/globals';

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

export function buildPermissionRepoMock(): jest.Mocked<PermissionRepositoryPort> {
  return {
    listAll: jest.fn(),
    findById: jest.fn(),
    findByKey: jest.fn(),
    findManyByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<PermissionRepositoryPort>;
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
