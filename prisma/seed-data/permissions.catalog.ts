export const RBAC_SUBJECTS = {
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  FILES: 'files',
} as const;

export const RBAC_ACTIONS = {
  // Generic
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage', // implied *
} as const;

// Define the canonical list of permissions
// Format: { subject: [actions] }
export const PERMISSION_CATALOG = {
  [RBAC_SUBJECTS.USER]: [
    RBAC_ACTIONS.READ,
    RBAC_ACTIONS.UPDATE,
    RBAC_ACTIONS.DELETE,
    RBAC_ACTIONS.MANAGE,
  ],
  [RBAC_SUBJECTS.ROLE]: [
    RBAC_ACTIONS.READ,
    RBAC_ACTIONS.CREATE,
    RBAC_ACTIONS.UPDATE,
    RBAC_ACTIONS.DELETE,
    RBAC_ACTIONS.MANAGE,
  ],
  [RBAC_SUBJECTS.PERMISSION]: [
    RBAC_ACTIONS.READ,
    RBAC_ACTIONS.CREATE,
    RBAC_ACTIONS.MANAGE,
  ],
  [RBAC_SUBJECTS.FILES]: [
    RBAC_ACTIONS.READ,
    RBAC_ACTIONS.CREATE,
    RBAC_ACTIONS.UPDATE,
    RBAC_ACTIONS.DELETE,
    RBAC_ACTIONS.MANAGE,
  ],
} as const;

export const DEFAULT_ROLES = {
  ADMIN: {
    name: 'Administrator',
    slug: 'admin',
    description: 'System administrator with full access',
    isSystem: true,
  },
  USER: {
    name: 'User',
    slug: 'user',
    description: 'Standard user',
    isSystem: true,
  },
} as const;
