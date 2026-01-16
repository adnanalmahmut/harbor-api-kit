export const GrantEffect = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
} as const;

export type GrantEffect = (typeof GrantEffect)[keyof typeof GrantEffect];

export class UserPermissionEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly permissionId: string,
    readonly effect: GrantEffect,
    readonly sourceRoleId: string | null,
    readonly note: string | null,
    readonly createdAt: Date,
  ) {}
}
