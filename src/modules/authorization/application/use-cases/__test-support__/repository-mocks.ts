import type { AuthorizationRepositoryPort } from '../../../domain/ports/authorization.repository.port.js';
import type { EffectivePermissionsService } from '../../services/effective-permissions.service.js';
import { jest } from '@jest/globals';

export function buildAuthorizationRepoMock(): jest.Mocked<AuthorizationRepositoryPort> {
  return {
    getUserRole: jest.fn(),
    listUserOverrides: jest.fn(),
    setUserPermissionOverride: jest.fn(),
    removeUserPermissionOverride: jest.fn(),
    replaceUserPermissions: jest.fn(),
  };
}

export type EffectivePermissionsMock = Pick<
  jest.Mocked<EffectivePermissionsService>,
  'buildForUser' | 'refreshForUser'
>;

export function buildEffectivePermissionsMock(): EffectivePermissionsMock {
  return {
    buildForUser: jest.fn(),
    refreshForUser: jest.fn(),
  } as EffectivePermissionsMock;
}
