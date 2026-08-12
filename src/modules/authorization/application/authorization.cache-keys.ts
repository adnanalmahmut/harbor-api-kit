import { AUTHORIZATION_POLICY_VERSION } from '../domain/permissions.catalog.js';

export const authorizationCacheKeys = {
  userPermissions: (userId: string) =>
    `authorization:user:${userId}:permissions`,
  userVersion: (userId: string) => `authorization:user:${userId}:version`,
  effectivePermissions: (userId: string, userVersion: string) =>
    `authorization:user:${userId}:effective:${AUTHORIZATION_POLICY_VERSION}:${userVersion}`,
} as const;
