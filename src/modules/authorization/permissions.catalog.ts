export const AUTHORIZATION_STATEMENTS = {
  user: [
    'create',
    'list',
    'get',
    'update',
    'delete',
    'set-role',
    'set-permission',
    'ban',
    'impersonate',
    'impersonate-admins',
    'set-password',
    'manage',
  ],
  session: ['list', 'revoke', 'delete', 'manage'],
  files: ['create', 'read', 'update', 'delete', 'manage'],
} as const;

export type AuthorizationResource = keyof typeof AUTHORIZATION_STATEMENTS;

export type AuthorizationAction<R extends AuthorizationResource> =
  (typeof AUTHORIZATION_STATEMENTS)[R][number];

export type PermissionKey = {
  [R in AuthorizationResource]: `${R}:${AuthorizationAction<R>}`;
}[AuthorizationResource];

type RoleGrant = {
  readonly [R in AuthorizationResource]?: readonly AuthorizationAction<R>[];
};

export const ROLE_GRANTS = {
  user: {
    files: ['create', 'read'],
  },
  admin: {
    user: AUTHORIZATION_STATEMENTS.user,
    session: AUTHORIZATION_STATEMENTS.session,
    files: AUTHORIZATION_STATEMENTS.files,
  },
} as const satisfies Record<string, RoleGrant>;

export type RoleName = keyof typeof ROLE_GRANTS;

export const DEFAULT_ROLE: RoleName = 'user';
export const ADMIN_ROLES = ['admin'] as const satisfies readonly RoleName[];
export const AUTHORIZATION_POLICY_VERSION = '1';

export const ROLE_NAMES = Object.freeze(Object.keys(ROLE_GRANTS) as RoleName[]);

export const PERMISSION_KEYS = Object.freeze(
  Object.entries(AUTHORIZATION_STATEMENTS).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}:${action}` as PermissionKey),
  ),
);

const permissionKeySet = new Set<string>(PERMISSION_KEYS);
const roleNameSet = new Set<string>(ROLE_NAMES);

export function isPermissionKey(value: string): value is PermissionKey {
  return permissionKeySet.has(value);
}

export function isRoleName(value: string): value is RoleName {
  return roleNameSet.has(value);
}

export function parseStoredRoles(role: string | null | undefined): {
  roles: RoleName[];
  unknown: string[];
} {
  const values = (role || DEFAULT_ROLE)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const roles: RoleName[] = [];
  const unknown: string[] = [];

  for (const value of new Set(values)) {
    if (isRoleName(value)) roles.push(value);
    else unknown.push(value);
  }

  return { roles, unknown };
}

export function permissionsForRoles(
  roles: readonly RoleName[],
): PermissionKey[] {
  const permissions = new Set<PermissionKey>();

  for (const role of roles) {
    const grants = ROLE_GRANTS[role] as RoleGrant;
    for (const [resource, actions] of Object.entries(grants)) {
      for (const action of actions || []) {
        permissions.add(`${resource}:${action}` as PermissionKey);
      }
    }
  }

  return Array.from(permissions).sort();
}
