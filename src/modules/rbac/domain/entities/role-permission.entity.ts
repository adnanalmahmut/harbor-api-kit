export class RolePermissionEntity {
  constructor(
    readonly id: string,
    readonly roleId: string,
    readonly permissionId: string,
    readonly createdAt: Date,
  ) {}
}
