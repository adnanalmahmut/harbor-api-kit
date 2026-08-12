import type {
  AuthorizationRepositoryPort,
  EffectivePermissionsService,
} from '#src/modules/authorization/index.js';
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
